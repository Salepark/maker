import type { ChatCommand, PipelineRunArgs } from "@shared/chatCommand";
import { runCollectNow, runAnalyzeNow, runDraftNow, runReportNow } from "../jobs/scheduler";
import { collectFromSourceIds } from "../services/rss";
import { analyzeNewItemsBySourceIds } from "../jobs/analyze_items";
import { hasSystemLLMKey } from "../llm/client";
import { storage } from "../storage";

export interface ExecutionResult {
  ok: boolean;
  assistantMessage: string;
  executed: ChatCommand;
  result: any;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function resolveBot(userId: string, botKey: string | null) {
  if (!botKey) return null;
  return storage.getBotByKey(userId, botKey);
}

async function execListBots(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const bots = await storage.listBots(userId);
  if (bots.length === 0) {
    return {
      ok: true,
      assistantMessage: "No bots registered. Create one from the Template Gallery.",
      executed: cmd,
      result: { bots: [] },
    };
  }

  const lines = bots.map((b, i) => {
    const status = b.isEnabled ? "Active" : "Paused";
    const schedule = b.settings?.scheduleRule || "DAILY";
    const time = b.settings?.scheduleTimeLocal || "07:00";
    return `${i + 1}. ${b.name} (${b.key}) — ${status}, ${schedule} ${time}`;
  });

  return {
    ok: true,
    assistantMessage: `${bots.length} bot(s):\n${lines.join("\n")}`,
    executed: cmd,
    result: { bots: bots.map(b => ({ id: b.id, key: b.key, name: b.name, isEnabled: b.isEnabled })) },
  };
}

async function execSwitchBot(userId: string, cmd: ChatCommand, threadId?: number): Promise<ExecutionResult> {
  if (!cmd.botKey) {
    return { ok: false, assistantMessage: "Please specify the bot key to switch to. e.g. 'switch to investing'", executed: cmd, result: null };
  }

  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: `Bot '${cmd.botKey}' not found. Try 'list bots' to see available bots.`, executed: cmd, result: null };
  }

  if (threadId) {
    await storage.setThreadActiveBot(threadId, userId, bot.id);
  }
  return {
    ok: true,
    assistantMessage: `Switched active bot to '${bot.name}' (${bot.key}).`,
    executed: cmd,
    result: { botId: bot.id, botKey: bot.key },
  };
}

async function execBotStatus(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `Bot '${cmd.botKey}' not found.` : "No active bot. Please switch to a bot first.", executed: cmd, result: null };
  }

  const fullBot = await storage.getBot(bot.id, userId);
  const botSources = await storage.getBotSources(bot.id);
  const enabledSources = botSources.filter(s => s.isEnabled);

  const status = fullBot?.isEnabled ? "Active" : "Paused";
  const schedule = fullBot?.settings?.scheduleRule || "DAILY";
  const time = fullBot?.settings?.scheduleTimeLocal || "07:00";
  const format = fullBot?.settings?.format || "clean";
  const verbosity = fullBot?.settings?.verbosity || "normal";

  const sourceList = enabledSources.length > 0
    ? enabledSources.map(s => `  - ${s.name}`).join("\n")
    : "  (no sources)";

  return {
    ok: true,
    assistantMessage: `${fullBot?.name} (${bot.key})\nStatus: ${status}\nSchedule: ${schedule} ${time}\nFormat: ${format} / ${verbosity}\n${enabledSources.length} source(s):\n${sourceList}`,
    executed: cmd,
    result: { botId: bot.id, status, schedule, sources: enabledSources.length },
  };
}

async function execRunNow(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const job = cmd.args?.job || "collect";

  try {
    let message: string;
    let result: any;

    const bot = cmd.botKey ? await resolveBot(userId, cmd.botKey) : null;
    const botSources = bot ? await storage.getBotSources(bot.id) : [];
    const botSourceIds = botSources.map(s => s.id);

    switch (job) {
      case "collect":
        if (botSourceIds.length > 0) {
          result = await collectFromSourceIds(botSourceIds);
          message = `Collection complete: ${result.totalCollected} new item(s) from ${result.sourcesProcessed} bot sources.`;
        } else {
          result = await runCollectNow();
          message = `Collection complete: ${result.totalCollected} new item(s).`;
        }
        break;
      case "analyze":
        if (botSourceIds.length > 0) {
          result = await analyzeNewItemsBySourceIds(botSourceIds);
          message = `Analysis complete: ${result} item(s) analyzed.`;
        } else {
          result = await runAnalyzeNow();
          message = `Analysis complete: ${result} item(s) analyzed.`;
        }
        break;
      case "draft":
        result = await runDraftNow();
        message = `Drafting complete: ${result} draft(s) generated.`;
        break;
      case "report": {
        if (!cmd.botKey) {
          return { ok: false, assistantMessage: "활성 봇이 없습니다. 먼저 봇을 선택해주세요.\n\n예: 'switch to community_research'", executed: cmd, result: null };
        }
        const topic = cmd.botKey;
        let profile = await storage.getProfileByUserAndTopic(userId, topic);
        if (!profile) {
          const bot = await storage.getBotByKey(userId, topic);
          if (!bot) {
            return { ok: false, assistantMessage: `No bot found for topic '${topic}'. Create a bot first from the Template Gallery.`, executed: cmd, result: null };
          }
          const fullBot = await storage.getBot(bot.id, userId);
          const allPresets = await storage.listPresets();
          const reportPresets = allPresets.filter(p => p.outputType === "report");
          const matchingPreset = reportPresets.find(p => {
            const variants = (p.variantsJson as string[]) || [];
            return variants.includes(topic) || p.key === topic;
          }) || reportPresets[0];

          if (!matchingPreset) {
            return { ok: false, assistantMessage: `No report template found. Please create a bot from the Template Gallery first.`, executed: cmd, result: null };
          }

          const settings = fullBot?.settings;
          const scheduleCron = settings
            ? `${settings.scheduleTimeLocal?.split(":")[1] || "0"} ${settings.scheduleTimeLocal?.split(":")[0] || "7"} * * ${settings.scheduleRule === "WEEKDAYS" ? "1-5" : settings.scheduleRule === "WEEKENDS" ? "0,6" : "*"}`
            : "0 7 * * *";

          const defaultSections = { tldr: true, drivers: true, risk: true, checklist: true, sources: true };
          const defaultFilters = { minImportanceScore: 0 };
          profile = await storage.createProfile({
            userId,
            presetId: matchingPreset.id,
            name: bot.name,
            topic,
            timezone: settings?.timezone || "Asia/Seoul",
            scheduleCron,
            configJson: {
              sections: settings?.sectionsJson || defaultSections,
              filters: settings?.filtersJson || defaultFilters,
              verbosity: settings?.verbosity || "normal",
              markdownLevel: settings?.markdownLevel || "minimal",
              scheduleRule: settings?.scheduleRule || "DAILY",
              scheduleTimeLocal: settings?.scheduleTimeLocal || "07:00",
            },
            isActive: bot.isEnabled,
          });

          const botSources = await storage.getBotSources(bot.id);
          if (botSources.length > 0) {
            await storage.setProfileSources(
              profile.id,
              userId,
              botSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }))
            );
          } else {
            return { ok: false, assistantMessage: `Bot '${bot.name}' has no sources. Please add sources first using 'add source' command or from the Sources page.`, executed: cmd, result: null };
          }
        }
        result = await runReportNow(profile.id, userId);
        if (!result) {
          return { ok: false, assistantMessage: `Report generation failed. The bot may have no sources or no recent items to analyze. Add sources and run collection first.`, executed: cmd, result: null };
        }
        const topicLabel = topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        message = `${topicLabel} report generated. (${result.itemsCount} item(s) analyzed)\nCheck the Reports page to view it.`;
        break;
      }
      default:
        return { ok: false, assistantMessage: `Unknown job: ${job}. Choose from: collect, analyze, draft, report.`, executed: cmd, result: null };
    }

    return { ok: true, assistantMessage: message, executed: cmd, result };
  } catch (error: any) {
    return { ok: false, assistantMessage: `Job execution failed: ${error?.message || String(error)}`, executed: cmd, result: null };
  }
}

export interface PipelineStepResult {
  step: "collect" | "analyze" | "report" | "schedule";
  ok: boolean;
  message: string;
  data?: any;
}

async function execPipelineRun(
  userId: string,
  cmd: ChatCommand,
  onStepComplete?: (step: PipelineStepResult) => Promise<void>
): Promise<ExecutionResult> {
  const args = (cmd.args || {}) as PipelineRunArgs;
  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return {
      ok: false,
      assistantMessage: cmd.botKey
        ? `'${cmd.botKey}' 봇을 찾을 수 없습니다.\n\n봇 목록을 확인하시거나, 템플릿 갤러리에서 새 봇을 만들어보세요.`
        : "활성 봇이 없습니다. 먼저 봇을 선택하거나 템플릿 갤러리에서 새 봇을 만들어주세요.",
      executed: cmd,
      result: null,
    };
  }

  const botSources = await storage.getBotSources(bot.id);
  if (botSources.length === 0) {
    return {
      ok: false,
      assistantMessage: `'${bot.name}' 봇에 연결된 소스가 없습니다.\n\n다음 중 하나를 시도해보세요:\n• "add source https://..." 명령으로 소스 추가\n• Sources 페이지에서 소스 관리\n• 봇 설정에서 추천 소스 활성화`,
      executed: cmd,
      result: null,
    };
  }

  const botLLM = await storage.resolveLLMForBot(bot.id);
  if (!hasSystemLLMKey() && !botLLM) {
    return {
      ok: false,
      assistantMessage: "AI Provider가 설정되지 않았습니다.\n\nSettings 페이지에서 AI Provider를 추가해주세요. (API 키가 필요합니다)",
      executed: cmd,
      result: null,
    };
  }

  const steps: PipelineStepResult[] = [];
  const botSourceIds = botSources.map(s => s.id);

  try {
    const collectResult = await collectFromSourceIds(botSourceIds);
    const collectStep: PipelineStepResult = {
      step: "collect",
      ok: true,
      message: `자료 수집 완료 — ${collectResult.totalCollected}건의 새 자료를 ${collectResult.sourcesProcessed}개 소스에서 가져왔습니다.`,
      data: collectResult,
    };
    steps.push(collectStep);
    if (onStepComplete) await onStepComplete(collectStep);
  } catch (error: any) {
    const collectStep: PipelineStepResult = {
      step: "collect",
      ok: false,
      message: "자료 수집 중 문제가 발생했습니다.\n\nSources 페이지에서 소스 URL이 올바른지 확인해주세요.",
    };
    steps.push(collectStep);
    if (onStepComplete) await onStepComplete(collectStep);
    return {
      ok: false,
      assistantMessage: collectStep.message,
      executed: cmd,
      result: { steps },
    };
  }

  try {
    const analyzeCount = await analyzeNewItemsBySourceIds(botSourceIds);
    const analyzeStep: PipelineStepResult = {
      step: "analyze",
      ok: true,
      message: `분석 완료 — ${analyzeCount}건의 자료를 분석했습니다.`,
      data: { analyzedCount: analyzeCount },
    };
    steps.push(analyzeStep);
    if (onStepComplete) await onStepComplete(analyzeStep);
  } catch (error: any) {
    const analyzeStep: PipelineStepResult = {
      step: "analyze",
      ok: false,
      message: "분석 중 문제가 발생했습니다.\n\nSettings에서 AI Provider 설정을 확인해주세요.",
    };
    steps.push(analyzeStep);
    if (onStepComplete) await onStepComplete(analyzeStep);
    return {
      ok: false,
      assistantMessage: analyzeStep.message,
      executed: cmd,
      result: { steps },
    };
  }

  const topic = bot.key;
  let profile = await storage.getProfileByUserAndTopic(userId, topic);
  if (!profile) {
    const fullBot = await storage.getBot(bot.id, userId);
    const allPresets = await storage.listPresets();
    const reportPresets = allPresets.filter(p => p.outputType === "report");
    const matchingPreset = reportPresets.find(p => {
      const variants = (p.variantsJson as string[]) || [];
      return variants.includes(topic) || p.key === topic;
    }) || reportPresets[0];

    if (!matchingPreset) {
      return {
        ok: false,
        assistantMessage: "리포트 템플릿을 찾을 수 없습니다.\n\n템플릿 갤러리에서 봇을 다시 만들어주세요.",
        executed: cmd,
        result: { steps },
      };
    }

    const settings = fullBot?.settings;
    const scheduleCron = settings
      ? `${settings.scheduleTimeLocal?.split(":")[1] || "0"} ${settings.scheduleTimeLocal?.split(":")[0] || "7"} * * ${settings.scheduleRule === "WEEKDAYS" ? "1-5" : settings.scheduleRule === "WEEKENDS" ? "0,6" : "*"}`
      : "0 7 * * *";

    const defaultSections = { tldr: true, drivers: true, risk: true, checklist: true, sources: true };
    const defaultFilters = { minImportanceScore: 0 };
    profile = await storage.createProfile({
      userId,
      presetId: matchingPreset.id,
      name: bot.name,
      topic,
      timezone: settings?.timezone || "Asia/Seoul",
      scheduleCron,
      configJson: {
        sections: settings?.sectionsJson || defaultSections,
        filters: settings?.filtersJson || defaultFilters,
        verbosity: settings?.verbosity || "normal",
        markdownLevel: settings?.markdownLevel || "minimal",
        scheduleRule: settings?.scheduleRule || "DAILY",
        scheduleTimeLocal: settings?.scheduleTimeLocal || "07:00",
      },
      isActive: bot.isEnabled,
    });

    if (botSources.length > 0) {
      await storage.setProfileSources(
        profile.id,
        userId,
        botSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }))
      );
    }
  }

  try {
    const reportResult = await runReportNow(profile.id, userId);
    if (!reportResult) {
      const reportStep: PipelineStepResult = {
        step: "report",
        ok: false,
        message: "리포트를 생성할 수 없습니다.\n\n분석된 자료가 부족할 수 있습니다. 잠시 후 다시 시도해주세요.",
      };
      steps.push(reportStep);
      if (onStepComplete) await onStepComplete(reportStep);
      return {
        ok: false,
        assistantMessage: reportStep.message,
        executed: cmd,
        result: { steps },
      };
    }

    const reportStep: PipelineStepResult = {
      step: "report",
      ok: true,
      message: `리포트 생성 완료 — ${Array.isArray(reportResult) ? reportResult.length : reportResult.itemsCount}건의 자료로 리포트를 만들었습니다.\n\nReports 페이지에서 확인하세요.`,
      data: reportResult,
    };
    steps.push(reportStep);
    if (onStepComplete) await onStepComplete(reportStep);
  } catch (error: any) {
    const reportStep: PipelineStepResult = {
      step: "report",
      ok: false,
      message: "리포트 생성 중 문제가 발생했습니다.\n\nSettings에서 AI Provider 설정을 확인해주세요.",
    };
    steps.push(reportStep);
    if (onStepComplete) await onStepComplete(reportStep);
    return {
      ok: false,
      assistantMessage: reportStep.message,
      executed: cmd,
      result: { steps },
    };
  }

  if (args.scheduleTimeLocal) {
    try {
      const scheduleRule = args.scheduleRule || "DAILY";
      await storage.updateBotSettings(bot.id, {
        scheduleTimeLocal: args.scheduleTimeLocal,
        scheduleRule,
      });

      if (profile) {
        const [hour, minute] = args.scheduleTimeLocal.split(":");
        const cronRule = scheduleRule === "WEEKDAYS" ? "1-5" : scheduleRule === "WEEKENDS" ? "0,6" : "*";
        const newCron = `${minute || "0"} ${hour || "7"} * * ${cronRule}`;
        await storage.updateProfile(profile.id, userId, { scheduleCron: newCron });
      }

      const scheduleStep: PipelineStepResult = {
        step: "schedule",
        ok: true,
        message: `스케줄 설정 완료 — 매일 ${args.scheduleTimeLocal}에 자동으로 실행됩니다.`,
      };
      steps.push(scheduleStep);
      if (onStepComplete) await onStepComplete(scheduleStep);
    } catch (error: any) {
      const scheduleStep: PipelineStepResult = {
        step: "schedule",
        ok: false,
        message: "스케줄 저장에 실패했습니다. 봇 설정 페이지에서 직접 설정해주세요.",
      };
      steps.push(scheduleStep);
      if (onStepComplete) await onStepComplete(scheduleStep);
    }
  }

  const summaryLines = steps
    .filter(s => s.ok)
    .map(s => s.message);
  const scheduleNote = args.scheduleTimeLocal
    ? `\n\n앞으로 매일 ${args.scheduleTimeLocal}에 자동 실행됩니다.`
    : "";

  return {
    ok: true,
    assistantMessage: `파이프라인 실행 완료!\n\n${summaryLines.join("\n")}${scheduleNote}`,
    executed: cmd,
    result: { steps },
  };
}

async function execPauseBot(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `Bot '${cmd.botKey}' not found.` : "No active bot.", executed: cmd, result: null };
  }

  if (!bot.isEnabled) {
    return { ok: true, assistantMessage: `'${bot.name}' is already paused.`, executed: cmd, result: { botId: bot.id } };
  }

  await storage.updateBot(bot.id, userId, { isEnabled: false });
  return {
    ok: true,
    assistantMessage: `'${bot.name}' has been paused. Scheduled jobs will be stopped.`,
    executed: cmd,
    result: { botId: bot.id },
  };
}

async function execResumeBot(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `Bot '${cmd.botKey}' not found.` : "No active bot.", executed: cmd, result: null };
  }

  if (bot.isEnabled) {
    return { ok: true, assistantMessage: `'${bot.name}' is already active.`, executed: cmd, result: { botId: bot.id } };
  }

  await storage.updateBot(bot.id, userId, { isEnabled: true });
  return {
    ok: true,
    assistantMessage: `'${bot.name}' has been resumed. Scheduled jobs will restart.`,
    executed: cmd,
    result: { botId: bot.id },
  };
}

async function execAddSource(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const url = cmd.args?.url;
  if (!url || typeof url !== "string") {
    return { ok: false, assistantMessage: "Please provide a URL for the source to add.", executed: cmd, result: null };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { ok: false, assistantMessage: "Invalid URL format. Must start with http:// or https://.", executed: cmd, result: null };
  }

  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `Bot '${cmd.botKey}' not found.` : "No active bot. Please switch to a bot first.", executed: cmd, result: null };
  }

  let source = await storage.findSourceByUrl(url);
  if (!source) {
    const name = cmd.args?.name || new URL(url).hostname;
    source = await storage.createSource({
      name,
      url,
      type: "rss",
      topic: bot.key,
      userId,
    });
  }

  const existingSources = await storage.getBotSources(bot.id);
  const alreadyLinked = existingSources.some(s => s.id === source!.id);
  if (alreadyLinked) {
    return { ok: true, assistantMessage: `'${source.name}' is already linked to '${bot.name}'.`, executed: cmd, result: { sourceId: source.id } };
  }

  const sourceData = [
    ...existingSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled })),
    { sourceId: source.id, weight: 3, isEnabled: true },
  ];
  await storage.setBotSources(bot.id, userId, sourceData);

  return {
    ok: true,
    assistantMessage: `Source '${source.name}' has been added to '${bot.name}'. It will be included in the next collection.`,
    executed: cmd,
    result: { sourceId: source.id, sourceName: source.name },
  };
}

async function execRemoveSource(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const sourceName = cmd.args?.sourceName;
  if (!sourceName || typeof sourceName !== "string") {
    return { ok: false, assistantMessage: "Please provide the name or URL of the source to remove.", executed: cmd, result: null };
  }

  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `Bot '${cmd.botKey}' not found.` : "No active bot.", executed: cmd, result: null };
  }

  const existingSources = await storage.getBotSources(bot.id);
  const lowerName = sourceName.toLowerCase();
  const target = existingSources.find(
    s => s.name.toLowerCase().includes(lowerName) || s.url.toLowerCase().includes(lowerName)
  );

  if (!target) {
    return { ok: false, assistantMessage: `No source matching '${sourceName}' found in '${bot.name}'.`, executed: cmd, result: null };
  }

  const remaining = existingSources
    .filter(s => s.id !== target.id)
    .map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }));
  await storage.setBotSources(bot.id, userId, remaining);

  return {
    ok: true,
    assistantMessage: `Source '${target.name}' has been removed from '${bot.name}'.`,
    executed: cmd,
    result: { sourceId: target.id, sourceName: target.name },
  };
}

export async function routeCommand(userId: string, cmd: ChatCommand, threadId?: number): Promise<ExecutionResult> {
  switch (cmd.type) {
    case "list_bots":
      return execListBots(userId, cmd);
    case "switch_bot":
      return execSwitchBot(userId, cmd, threadId);
    case "bot_status":
      return execBotStatus(userId, cmd);
    case "run_now":
      return execRunNow(userId, cmd);
    case "pause_bot":
      return execPauseBot(userId, cmd);
    case "resume_bot":
      return execResumeBot(userId, cmd);
    case "add_source":
      return execAddSource(userId, cmd);
    case "remove_source":
      return execRemoveSource(userId, cmd);
    case "pipeline_run":
      return execPipelineRun(userId, cmd);
    case "chat":
      return {
        ok: true,
        assistantMessage: cmd.args?.reply || "How can I help? Try 'list bots', 'bot status', or 'run collect'.",
        executed: cmd,
        result: null,
      };
    default:
      return {
        ok: false,
        assistantMessage: "Unknown command. Try 'list bots' to get started.",
        executed: cmd,
        result: null,
      };
  }
}

export { routeCommand as executeCommand, execPipelineRun };
