import type { ChatCommand } from "@shared/chatCommand";
import { runCollectNow, runAnalyzeNow, runDraftNow, runDailyBriefNow } from "../jobs/scheduler";
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
      assistantMessage: "등록된 봇이 없습니다. Template Gallery에서 봇을 만들어보세요.",
      executed: cmd,
      result: { bots: [] },
    };
  }

  const lines = bots.map((b, i) => {
    const status = b.isEnabled ? "활성" : "정지";
    const schedule = b.settings?.scheduleRule || "DAILY";
    const time = b.settings?.scheduleTimeLocal || "07:00";
    return `${i + 1}. ${b.name} (${b.key}) — ${status}, ${schedule} ${time}`;
  });

  return {
    ok: true,
    assistantMessage: `봇 ${bots.length}개:\n${lines.join("\n")}`,
    executed: cmd,
    result: { bots: bots.map(b => ({ id: b.id, key: b.key, name: b.name, isEnabled: b.isEnabled })) },
  };
}

async function execSwitchBot(userId: string, cmd: ChatCommand, threadId?: number): Promise<ExecutionResult> {
  if (!cmd.botKey) {
    return { ok: false, assistantMessage: "전환할 봇의 key를 지정해주세요. 예: 'investing으로 전환'", executed: cmd, result: null };
  }

  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: `'${cmd.botKey}' 봇을 찾을 수 없습니다. '내 봇 목록'으로 확인해보세요.`, executed: cmd, result: null };
  }

  if (threadId) {
    await storage.setThreadActiveBot(threadId, userId, bot.id);
  }
  return {
    ok: true,
    assistantMessage: `활성 봇을 '${bot.name}' (${bot.key})으로 전환했습니다.`,
    executed: cmd,
    result: { botId: bot.id, botKey: bot.key },
  };
}

async function execBotStatus(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `'${cmd.botKey}' 봇을 찾을 수 없습니다.` : "활성 봇이 없습니다. 먼저 봇을 전환해주세요.", executed: cmd, result: null };
  }

  const fullBot = await storage.getBot(bot.id, userId);
  const botSources = await storage.getBotSources(bot.id);
  const enabledSources = botSources.filter(s => s.isEnabled);

  const status = fullBot?.isEnabled ? "활성" : "정지";
  const schedule = fullBot?.settings?.scheduleRule || "DAILY";
  const time = fullBot?.settings?.scheduleTimeLocal || "07:00";
  const format = fullBot?.settings?.format || "clean";
  const verbosity = fullBot?.settings?.verbosity || "normal";

  const sourceList = enabledSources.length > 0
    ? enabledSources.map(s => `  - ${s.name}`).join("\n")
    : "  (소스 없음)";

  return {
    ok: true,
    assistantMessage: `${fullBot?.name} (${bot.key})\n상태: ${status}\n스케줄: ${schedule} ${time}\n포맷: ${format} / ${verbosity}\n소스 ${enabledSources.length}개:\n${sourceList}`,
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
        message = `수집 완료: ${result.totalCollected}개 새 아이템.`;
        break;
      case "analyze":
        result = await runAnalyzeNow();
        message = `분석 완료: ${result}개 아이템 분석됨.`;
        break;
      case "draft":
        result = await runDraftNow();
        message = `드래프트 완료: ${result}개 드래프트 생성됨.`;
        break;
      case "report": {
        const topic = cmd.botKey || "ai_art";
        const lookback = clamp(cmd.args?.lookbackHours || 24, 1, 168);
        const maxItems = clamp(cmd.args?.maxItems || 12, 5, 30);
        result = await runDailyBriefNow(topic, lookback, maxItems);
        const topicLabel = topic === "ai_art" ? "AI Art" : topic;
        message = `${topicLabel} 리포트 생성 완료. (${result.itemsCount}개 아이템 분석)`;
        break;
      }
      default:
        return { ok: false, assistantMessage: `알 수 없는 작업: ${job}. collect, analyze, draft, report 중 선택해주세요.`, executed: cmd, result: null };
    }

    return { ok: true, assistantMessage: message, executed: cmd, result };
  } catch (error: any) {
    return { ok: false, assistantMessage: `작업 실행 실패: ${error?.message || String(error)}`, executed: cmd, result: null };
  }
}

async function execPauseBot(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `'${cmd.botKey}' 봇을 찾을 수 없습니다.` : "활성 봇이 없습니다.", executed: cmd, result: null };
  }

  if (!bot.isEnabled) {
    return { ok: true, assistantMessage: `'${bot.name}'은(는) 이미 일시정지 상태입니다.`, executed: cmd, result: { botId: bot.id } };
  }

  await storage.updateBot(bot.id, userId, { isEnabled: false });
  return {
    ok: true,
    assistantMessage: `'${bot.name}' 봇을 일시정지했습니다. 스케줄 작업이 중단됩니다.`,
    executed: cmd,
    result: { botId: bot.id },
  };
}

async function execResumeBot(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `'${cmd.botKey}' 봇을 찾을 수 없습니다.` : "활성 봇이 없습니다.", executed: cmd, result: null };
  }

  if (bot.isEnabled) {
    return { ok: true, assistantMessage: `'${bot.name}'은(는) 이미 활성 상태입니다.`, executed: cmd, result: { botId: bot.id } };
  }

  await storage.updateBot(bot.id, userId, { isEnabled: true });
  return {
    ok: true,
    assistantMessage: `'${bot.name}' 봇을 재개했습니다. 스케줄 작업이 재시작됩니다.`,
    executed: cmd,
    result: { botId: bot.id },
  };
}

async function execAddSource(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const url = cmd.args?.url;
  if (!url || typeof url !== "string") {
    return { ok: false, assistantMessage: "추가할 소스의 URL을 입력해주세요.", executed: cmd, result: null };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { ok: false, assistantMessage: "올바른 URL 형식이 아닙니다. http:// 또는 https://로 시작해야 합니다.", executed: cmd, result: null };
  }

  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `'${cmd.botKey}' 봇을 찾을 수 없습니다.` : "활성 봇이 없습니다. 먼저 봇을 전환해주세요.", executed: cmd, result: null };
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
    return { ok: true, assistantMessage: `'${source.name}'은(는) 이미 '${bot.name}'에 연결되어 있습니다.`, executed: cmd, result: { sourceId: source.id } };
  }

  const sourceData = [
    ...existingSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled })),
    { sourceId: source.id, weight: 3, isEnabled: true },
  ];
  await storage.setBotSources(bot.id, userId, sourceData);

  return {
    ok: true,
    assistantMessage: `소스 '${source.name}'을(를) '${bot.name}'에 추가했습니다. 다음 수집 시 반영됩니다.`,
    executed: cmd,
    result: { sourceId: source.id, sourceName: source.name },
  };
}

async function execRemoveSource(userId: string, cmd: ChatCommand): Promise<ExecutionResult> {
  const sourceName = cmd.args?.sourceName;
  if (!sourceName || typeof sourceName !== "string") {
    return { ok: false, assistantMessage: "제거할 소스의 이름 또는 URL을 입력해주세요.", executed: cmd, result: null };
  }

  const bot = await resolveBot(userId, cmd.botKey);
  if (!bot) {
    return { ok: false, assistantMessage: cmd.botKey ? `'${cmd.botKey}' 봇을 찾을 수 없습니다.` : "활성 봇이 없습니다.", executed: cmd, result: null };
  }

  const existingSources = await storage.getBotSources(bot.id);
  const lowerName = sourceName.toLowerCase();
  const target = existingSources.find(
    s => s.name.toLowerCase().includes(lowerName) || s.url.toLowerCase().includes(lowerName)
  );

  if (!target) {
    return { ok: false, assistantMessage: `'${sourceName}'와(과) 일치하는 소스를 '${bot.name}'에서 찾을 수 없습니다.`, executed: cmd, result: null };
  }

  const remaining = existingSources
    .filter(s => s.id !== target.id)
    .map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }));
  await storage.setBotSources(bot.id, userId, remaining);

  return {
    ok: true,
    assistantMessage: `소스 '${target.name}'을(를) '${bot.name}'에서 제거했습니다.`,
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
        assistantMessage: cmd.args?.reply || "무엇을 도와드릴까요? '내 봇 목록', '봇 상태', '수집 실행' 등을 시도해보세요.",
        executed: cmd,
        result: null,
      };
    default:
      return {
        ok: false,
        assistantMessage: "알 수 없는 명령입니다. '내 봇 목록'으로 시작해보세요.",
        executed: cmd,
        result: null,
      };
  }
}

export { routeCommand as executeCommand };
