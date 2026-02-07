import type { ChatCommand } from "@shared/chatCommand";
import { runCollectNow, runAnalyzeNow, runDraftNow, runReportNow } from "../jobs/scheduler";
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

    switch (job) {
      case "collect":
        result = await runCollectNow();
        message = `Collection complete: ${result.totalCollected} new item(s).`;
        break;
      case "analyze":
        result = await runAnalyzeNow();
        message = `Analysis complete: ${result} item(s) analyzed.`;
        break;
      case "draft":
        result = await runDraftNow();
        message = `Drafting complete: ${result} draft(s) generated.`;
        break;
      case "report": {
        const topic = cmd.botKey || "ai_art";
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
        const topicLabel = topic === "ai_art" ? "AI Art" : topic;
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

export { routeCommand as executeCommand };
