import type { ChatCommand, PipelineRunArgs } from "@shared/chatCommand";
import { runCollectNow, runAnalyzeNow, runDraftNow, runReportNow } from "../jobs/scheduler";
import { collectFromSourceIds } from "../services/rss";
import { analyzeNewItemsBySourceIds } from "../jobs/analyze_items";
import { generateFastReport, upgradeToFullReport } from "../jobs/report";
import { hasSystemLLMKey } from "../llm/client";
import { storage } from "../storage";
import { startRun, endRunOk, endRunError, endRunTimeout } from "../jobs/runLogger";

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
          result = await analyzeNewItemsBySourceIds(botSourceIds, 15, 5);
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
          return { ok: false, assistantMessage: "No active bot. Please select a bot first.\n\nExample: 'switch to community_research'", executed: cmd, result: null };
        }
        const topic = cmd.botKey;
        const reportBot = await resolveBot(userId, topic);
        if (!reportBot) {
          return { ok: false, assistantMessage: `No bot found for topic '${topic}'. Create a bot first from the Template Gallery.`, executed: cmd, result: null };
        }

        let profile = await storage.getProfileByUserAndTopic(userId, topic);
        if (!profile) {
          const fullBot = await storage.getBot(reportBot.id, userId);
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
            name: reportBot.name,
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
            isActive: reportBot.isEnabled,
          });

          const reportBotSources = await storage.getBotSources(reportBot.id);
          if (reportBotSources.length > 0) {
            await storage.setProfileSources(
              profile.id,
              userId,
              reportBotSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }))
            );
          } else {
            return { ok: false, assistantMessage: `Bot '${reportBot.name}' has no sources. Please add sources first.`, executed: cmd, result: null };
          }
        }

        const reportSourceIds = await storage.getProfileSourceIds(profile.id);
        const reportBotSourceList = await storage.getBotSources(reportBot.id);
        const reportSourceNames = reportBotSourceList.length > 0
          ? reportBotSourceList.map(s => s.name)
          : botSources.map(s => s.name);
        const fastResult = await generateFastReport({
          profileId: profile.id,
          userId,
          presetId: profile.presetId,
          topic,
          profileName: profile.name,
          sourceIds: reportSourceIds,
          collectResult: { totalCollected: 0, sourcesProcessed: 0 },
          sourceNames: reportSourceNames,
          timezone: profile.timezone || "Asia/Seoul",
        });

        const topicLabel = topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        message = fastResult.itemsCount > 0
          ? `${topicLabel} 초기 브리핑이 제출되었습니다 (${fastResult.itemsCount}건).\nReports 페이지에서 확인하세요.\n\n심화 분석은 백그라운드에서 자동으로 진행되며, 완료되면 리포트가 업데이트됩니다.`
          : `${topicLabel} 초기 브리핑이 제출되었습니다.\n수집된 자료가 없어 현황 리포트를 작성했습니다. '자료 수집하고 리포트 만들어줘'로 새 데이터를 먼저 수집해보세요.`;

        if (fastResult.reportId && fastResult.itemsCount > 0 && hasSystemLLMKey()) {
          const profileIdForUpgrade = profile.id;
          const reportIdForUpgrade = fastResult.reportId;
          (async () => {
            try {
              const analyzeCount = await analyzeNewItemsBySourceIds(reportSourceIds, 15, 5);
              console.log(`[ReportOnly:Background] Analyzed ${analyzeCount} items. Upgrading...`);
              await upgradeToFullReport(reportIdForUpgrade, profileIdForUpgrade, userId);
            } catch (e) {
              console.error("[ReportOnly:Background] Upgrade failed:", e);
            }
          })();
        }
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
  step: "collect" | "analyze" | "report" | "schedule" | "start" | "timeout";
  ok: boolean;
  message: string;
  data?: any;
}

const PIPELINE_HARD_TIMEOUT_MS = 25_000;

class PipelineTimeoutError extends Error {
  constructor() { super("Pipeline timeout"); this.name = "PipelineTimeoutError"; }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new PipelineTimeoutError()), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function execPipelineRunInner(
  userId: string,
  cmd: ChatCommand,
  onStepComplete?: (step: PipelineStepResult) => Promise<void>
): Promise<ExecutionResult> {
  const args = (cmd.args || {}) as PipelineRunArgs;
  const lang = (args.lang) || "en";
  const ko = lang === "ko";

  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return {
      ok: false,
      assistantMessage: cmd.botKey
        ? ko
          ? `'${cmd.botKey}' 봇을 찾을 수 없습니다.\n\n봇 목록을 확인하시거나, 템플릿 갤러리에서 새 봇을 만들어보세요.`
          : `Bot '${cmd.botKey}' not found.\n\nCheck your bot list or create a new bot from the Template Gallery.`
        : ko
          ? "활성 봇이 없습니다. 먼저 봇을 선택하거나 템플릿 갤러리에서 새 봇을 만들어주세요."
          : "No active bot. Please select a bot or create one from the Template Gallery.",
      executed: cmd,
      result: null,
    };
  }

  const botSources = await storage.getBotSources(bot.id);
  if (botSources.length === 0) {
    return {
      ok: false,
      assistantMessage: ko
        ? `'${bot.name}' 봇에 연결된 소스가 없습니다.\n\n다음 중 하나를 시도해보세요:\n• "add source https://..." 명령으로 소스 추가\n• Sources 페이지에서 소스 관리\n• 봇 설정에서 추천 소스 활성화`
        : `Bot '${bot.name}' has no sources.\n\nTry one of these:\n• Add a source with "add source https://..."\n• Manage sources on the Sources page\n• Enable recommended sources in bot settings`,
      executed: cmd,
      result: null,
    };
  }

  const botLLM = await storage.resolveLLMForBot(bot.id);
  if (!hasSystemLLMKey() && !botLLM) {
    return {
      ok: false,
      assistantMessage: ko
        ? "AI Provider가 설정되지 않았습니다.\n\nSettings 페이지에서 AI Provider를 추가해주세요. (API 키가 필요합니다)"
        : "No AI Provider configured.\n\nPlease add an AI Provider on the Settings page. (API key required)",
      executed: cmd,
      result: null,
    };
  }

  const steps: PipelineStepResult[] = [];
  const botSourceIds = botSources.map(s => s.id);

  if (onStepComplete) {
    await onStepComplete({
      step: "start",
      ok: true,
      message: ko
        ? `'${bot.name}' 파이프라인을 시작합니다... (${botSources.length}개 소스)`
        : `Starting '${bot.name}' pipeline... (${botSources.length} source(s))`,
    });
  }

  if (args.scheduleTimeLocal) {
    try {
      const scheduleRule = args.scheduleRule || "DAILY";
      await storage.updateBotSettings(bot.id, {
        scheduleTimeLocal: args.scheduleTimeLocal,
        scheduleRule,
      });

      const topic = bot.key;
      let profile = await storage.getProfileByUserAndTopic(userId, topic);
      if (profile) {
        const [hour, minute] = args.scheduleTimeLocal.split(":");
        const cronRule = scheduleRule === "WEEKDAYS" ? "1-5" : scheduleRule === "WEEKENDS" ? "0,6" : "*";
        const newCron = `${minute || "0"} ${hour || "7"} * * ${cronRule}`;
        await storage.updateProfile(profile.id, userId, { scheduleCron: newCron });
      }

      const scheduleStep: PipelineStepResult = {
        step: "schedule",
        ok: true,
        message: ko
          ? `스케줄 설정 완료 — 매일 ${args.scheduleTimeLocal}에 자동으로 실행됩니다.`
          : `Schedule set — will run daily at ${args.scheduleTimeLocal}.`,
      };
      steps.push(scheduleStep);
      if (onStepComplete) await onStepComplete(scheduleStep);
    } catch (error: any) {
      const scheduleStep: PipelineStepResult = {
        step: "schedule",
        ok: false,
        message: ko
          ? "스케줄 저장에 실패했습니다. 봇 설정 페이지에서 직접 설정해주세요."
          : "Failed to save schedule. Please set it manually on the bot settings page.",
      };
      steps.push(scheduleStep);
      if (onStepComplete) await onStepComplete(scheduleStep);
    }
  }

  let collectResult: { totalCollected: number; sourcesProcessed: number };
  try {
    collectResult = await collectFromSourceIds(botSourceIds);
    const collectStep: PipelineStepResult = {
      step: "collect",
      ok: true,
      message: ko
        ? `자료 수집 완료 — ${collectResult.totalCollected}건의 새 자료를 ${collectResult.sourcesProcessed}개 소스에서 가져왔습니다.`
        : `Collection complete: ${collectResult.totalCollected} new item(s) from ${collectResult.sourcesProcessed} source(s).`,
      data: collectResult,
    };
    steps.push(collectStep);
    if (onStepComplete) await onStepComplete(collectStep);
  } catch (error: any) {
    collectResult = { totalCollected: 0, sourcesProcessed: 0 };
    const collectStep: PipelineStepResult = {
      step: "collect",
      ok: false,
      message: ko
        ? "자료 수집 중 문제가 발생했습니다.\n\nSources 페이지에서 소스 URL이 올바른지 확인해주세요."
        : "Data collection failed.\n\nPlease check your source URLs on the Sources page.",
    };
    steps.push(collectStep);
    if (onStepComplete) await onStepComplete(collectStep);
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
        assistantMessage: ko
          ? "리포트 템플릿을 찾을 수 없습니다.\n\n템플릿 갤러리에서 봇을 다시 만들어주세요."
          : "No report template found.\n\nPlease create a bot from the Template Gallery.",
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

  let fastReportId: number | null = null;
  try {
    const fastResult = await generateFastReport({
      profileId: profile.id,
      userId,
      presetId: profile.presetId,
      topic,
      profileName: profile.name,
      sourceIds: botSourceIds,
      collectResult,
      sourceNames: botSources.map(s => s.name),
      timezone: profile.timezone || "Asia/Seoul",
    });
    fastReportId = fastResult.reportId;

    const reportStep: PipelineStepResult = {
      step: "report",
      ok: true,
      message: ko
        ? `초기 브리핑 제출 완료 — ${fastResult.itemsCount}건의 자료를 요약했습니다. Reports 페이지에서 확인하세요.`
        : `Quick briefing delivered — summarized ${fastResult.itemsCount} item(s). Check the Reports page.`,
      data: fastResult,
    };
    steps.push(reportStep);
    if (onStepComplete) await onStepComplete(reportStep);
  } catch (error: any) {
    console.error("[Pipeline] Fast report generation failed:", error);
    const reportStep: PipelineStepResult = {
      step: "report",
      ok: false,
      message: ko ? "리포트 생성 중 문제가 발생했습니다." : "Failed to generate report.",
    };
    steps.push(reportStep);
    if (onStepComplete) await onStepComplete(reportStep);
  }

  const profileIdForUpgrade = profile.id;
  const reportIdForUpgrade = fastReportId;
  if (reportIdForUpgrade) {
    (async () => {
      try {
        console.log(`[Pipeline:Background] Starting analyze + full report upgrade for report ${reportIdForUpgrade}...`);
        const analyzeCount = await analyzeNewItemsBySourceIds(botSourceIds, 15, 5);
        console.log(`[Pipeline:Background] Analyzed ${analyzeCount} items. Upgrading report...`);
        const upgraded = await upgradeToFullReport(reportIdForUpgrade, profileIdForUpgrade, userId);
        if (upgraded) {
          console.log(`[Pipeline:Background] Report ${reportIdForUpgrade} upgraded to full (${upgraded.itemsCount} items)`);
        } else {
          console.log(`[Pipeline:Background] Report ${reportIdForUpgrade} kept as status report (no analyzed items available)`);
        }
      } catch (error) {
        console.error("[Pipeline:Background] Background upgrade failed:", error);
      }
    })();
  }

  const summaryLines = steps
    .filter(s => s.ok)
    .map(s => s.message);
  const hasSchedule = steps.some(s => s.step === "schedule" && s.ok);
  const scheduleNote = hasSchedule && args.scheduleTimeLocal
    ? ko
      ? `\n\n앞으로 매일 ${args.scheduleTimeLocal}에 자동 실행됩니다.`
      : `\n\nScheduled to run daily at ${args.scheduleTimeLocal}.`
    : "";
  const hasReport = steps.some(s => s.step === "report" && s.ok);
  const checkReportsNote = hasReport
    ? ko
      ? "\n\nReports 페이지에서 리포트를 확인하세요."
      : "\n\nYour report is ready — check the Reports page."
    : "";

  const briefingNote = hasReport
    ? ko
      ? "\n\n초기 브리핑은 이미 제공되었습니다.\n심화 분석은 백그라운드에서 자동으로 진행되며, 완료되면 리포트가 업데이트됩니다."
      : "\n\nYour quick briefing is ready.\nDeep analysis runs in the background — the report will update automatically when done."
    : "";

  return {
    ok: true,
    assistantMessage: ko
      ? `${hasReport ? "초기 브리핑이 제출되었습니다." : "완료!"}\n\n${summaryLines.join("\n")}${scheduleNote}${checkReportsNote}${briefingNote}`
      : `${hasReport ? "Quick briefing delivered." : "Done!"}\n\n${summaryLines.join("\n")}${scheduleNote}${checkReportsNote}${briefingNote}`,
    executed: cmd,
    result: { steps },
  };
}

async function execPipelineRun(
  userId: string,
  cmd: ChatCommand,
  onStepComplete?: (step: PipelineStepResult) => Promise<void>
): Promise<ExecutionResult> {
  const args = (cmd.args || {}) as PipelineRunArgs;
  const lang = (args.lang) || "en";
  const ko = lang === "ko";

  const bot = await resolveBot(userId, cmd.botKey);
  const runId = await startRun({
    userId,
    botId: bot?.id ?? null,
    botKey: cmd.botKey || bot?.key || "unknown",
    jobType: "pipeline",
    trigger: "console",
    meta: { scheduleTimeLocal: args.scheduleTimeLocal, lang },
  });

  try {
    const result = await withTimeout(
      execPipelineRunInner(userId, cmd, onStepComplete),
      PIPELINE_HARD_TIMEOUT_MS,
      "pipeline_run",
    );

    if (result.ok) {
      const reportStep = result.result?.steps?.find((s: any) => s.step === "report" && s.ok);
      await endRunOk(runId, {
        outputId: reportStep?.data?.reportId,
        reportStage: "fast",
        itemsCollected: reportStep?.data?.itemsCount,
      });
    } else {
      await endRunError(runId, {
        errorCode: "PIPELINE_FAILED",
        errorMessage: result.assistantMessage?.slice(0, 200) || "Pipeline failed",
      });
    }

    return result;
  } catch (error: any) {
    if (error instanceof PipelineTimeoutError) {
      await endRunTimeout(runId, "Pipeline hard timeout (25s)");
      if (onStepComplete) {
        await onStepComplete({
          step: "timeout",
          ok: true,
          message: ko
            ? "시간이 초과되어 빠른 브리핑만 제공했습니다.\n심화 분석은 백그라운드에서 계속 진행됩니다.\n\nReports 페이지에서 확인하세요."
            : "Pipeline timed out — quick briefing has been delivered.\nDeep analysis continues in the background.\n\nCheck the Reports page for updates.",
        });
      }
      return {
        ok: true,
        assistantMessage: ko
          ? "시간이 초과되어 빠른 브리핑만 제공했습니다.\n심화 분석은 백그라운드에서 계속 진행됩니다.\n\nReports 페이지에서 확인하세요."
          : "Pipeline timed out — quick briefing has been delivered.\nDeep analysis continues in the background.\n\nCheck the Reports page for updates.",
        executed: cmd,
        result: { timedOut: true },
      };
    }
    await endRunError(runId, {
      errorCode: "PIPELINE_ERROR",
      errorMessage: String(error.message || error).slice(0, 200),
      errorDetailJson: { stack: String(error.stack || "").slice(0, 500) },
    });
    throw error;
  }
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
        assistantMessage: cmd.args?.reply || "How can I help? Try: list bots / bot status / run collect / run analyze / run report\n\n사용 가능한 명령어: 봇 목록 보여줘 / 봇 상태 보여줘 / 수집 실행 / 분석 실행 / 리포트 작성",
        executed: cmd,
        result: null,
      };
    default:
      return {
        ok: false,
        assistantMessage: "Unknown command. Try: list bots / bot status / run collect\n\n사용 가능한 명령어: 봇 목록 보여줘 / 봇 상태 보여줘 / 수집 실행",
        executed: cmd,
        result: null,
      };
  }
}

export { routeCommand as executeCommand, execPipelineRun };
