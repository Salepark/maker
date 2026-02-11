import { callLLMWithJsonParsing } from "../llm/client";
import { buildCommandParsePrompt, buildClarificationPrompt, type CommandParseContext } from "../llm/prompts_chat";
import type { ChatCommand, ChatCommandType } from "@shared/chatCommand";

export type { ChatCommand, ChatCommandType };
export type { CommandParseContext };

function isKoreanInput(text: string): boolean {
  const koreanChars = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g);
  return (koreanChars?.length || 0) > text.length * 0.1;
}

const COMMAND_HINT_KEYWORDS = [
  "add", "delete", "run", "now", "immediately", "schedule",
  "pause", "resume", "status", "list", "switch",
  "bot", "source", "collect", "analyze", "draft", "report",
  "stop", "halt", "start", "enable", "disable",
  "remove",
  "봇", "상태", "목록", "리스트", "전환", "소스", "추가", "삭제", "제거",
  "중지", "재개", "일시정지", "점검", "요약", "브리핑", "보여",
  "수집", "분석", "리포트", "보고서", "제출", "모아", "정리",
  "스케줄", "매일", "아침", "저녁", "오전", "오후",
  "pipeline", "자동", "실행", "돌려", "작성", "파이프라인",
];

function isCommandCandidate(message: string): boolean {
  const lower = message.toLowerCase();
  if (lower.includes("http://") || lower.includes("https://")) return true;
  return COMMAND_HINT_KEYWORDS.some(kw => lower.includes(kw));
}

export interface ParseResult {
  command: ChatCommand;
  clarificationNeeded: boolean;
  clarificationText?: string;
}

function tryKeywordFallback(message: string, context: CommandParseContext): ChatCommand | null {
  const lower = message.toLowerCase();
  const botKey = context.activeBotKey;
  const ko = isKoreanInput(message);

  const hasPipelineIntent = (
    (lower.includes("수집") && (lower.includes("분석") || lower.includes("리포트") || lower.includes("보고서") || lower.includes("작성"))) ||
    (lower.includes("collect") && (lower.includes("analyz") || lower.includes("report"))) ||
    (lower.includes("분석") && (lower.includes("리포트") || lower.includes("보고서") || lower.includes("작성"))) ||
    (lower.includes("analyz") && lower.includes("report")) ||
    (lower.includes("파이프라인") || lower.includes("pipeline"))
  );

  if (hasPipelineIntent) {
    let scheduleRule: string | undefined;
    let scheduleTimeLocal: string | undefined;

    if (lower.includes("매일") || lower.includes("daily")) scheduleRule = "DAILY";
    if (lower.includes("평일") || lower.includes("weekday")) scheduleRule = "WEEKDAYS";

    const timeMatch = message.match(/(\d{1,2})\s*[시:]\s*(\d{0,2})/);
    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, "0");
      const minute = (timeMatch[2] || "00").padStart(2, "0");
      scheduleTimeLocal = `${hour}:${minute}`;
    }
    if (lower.includes("아침") && !scheduleTimeLocal) scheduleTimeLocal = "09:00";
    if (lower.includes("저녁") && !scheduleTimeLocal) scheduleTimeLocal = "18:00";
    if (lower.includes("오전") && !scheduleTimeLocal) scheduleTimeLocal = "09:00";
    if (lower.includes("오후") && !scheduleTimeLocal) scheduleTimeLocal = "14:00";

    const args: Record<string, any> = { lang: ko ? "ko" : "en" };
    if (scheduleRule) args.scheduleRule = scheduleRule;
    if (scheduleTimeLocal) args.scheduleTimeLocal = scheduleTimeLocal;

    const confirmText = ko
      ? `자료 수집 → 분석 → 리포트 생성${scheduleTimeLocal ? ` (${scheduleTimeLocal})` : ""}${scheduleRule ? ` ${scheduleRule}` : ""}`
      : `Collect → Analyze → Generate report${scheduleTimeLocal ? ` (${scheduleTimeLocal})` : ""}${scheduleRule ? ` ${scheduleRule}` : ""}`;

    return {
      type: "pipeline_run",
      botKey: botKey,
      args,
      confidence: 0.8,
      needsConfirm: true,
      confirmText,
    };
  }

  const hasCollectOnly = (
    (lower.includes("수집") || lower.includes("모아") || lower.includes("collect")) &&
    !lower.includes("분석") && !lower.includes("리포트") && !lower.includes("보고서") && !lower.includes("작성")
  );
  if (hasCollectOnly) {
    return {
      type: "run_now",
      botKey: botKey,
      args: { job: "collect" },
      confidence: 0.8,
      needsConfirm: true,
      confirmText: ko ? "자료 수집 실행" : "Run data collection",
    };
  }

  const hasAnalyzeOnly = (
    (lower.includes("분석") || lower.includes("analyz")) &&
    !lower.includes("수집") && !lower.includes("리포트") && !lower.includes("보고서") && !lower.includes("작성")
  );
  if (hasAnalyzeOnly) {
    return {
      type: "run_now",
      botKey: botKey,
      args: { job: "analyze" },
      confidence: 0.8,
      needsConfirm: true,
      confirmText: ko ? "분석 실행" : "Run analysis",
    };
  }

  const hasReportOnly = (
    (lower.includes("리포트") || lower.includes("보고서") || lower.includes("report")) &&
    !lower.includes("수집") && !lower.includes("분석")
  );
  if (hasReportOnly) {
    return {
      type: "run_now",
      botKey: botKey,
      args: { job: "report" },
      confidence: 0.8,
      needsConfirm: true,
      confirmText: ko ? "리포트 생성" : "Generate report",
    };
  }

  if (lower.includes("list") && lower.includes("bot") || lower.includes("봇 목록") || lower.includes("봇 리스트")) {
    return {
      type: "list_bots",
      botKey: botKey,
      args: {},
      confidence: 0.9,
      needsConfirm: false,
      confirmText: ko ? "봇 목록 조회" : "List bots",
    };
  }

  if ((lower.includes("status") || lower.includes("상태")) && (lower.includes("bot") || lower.includes("봇"))) {
    return {
      type: "bot_status",
      botKey: botKey,
      args: {},
      confidence: 0.9,
      needsConfirm: false,
      confirmText: ko ? "봇 상태 조회" : "Bot status",
    };
  }

  if (lower.includes("pause") || lower.includes("일시정지") || lower.includes("중지")) {
    return {
      type: "pause_bot",
      botKey: botKey,
      args: {},
      confidence: 0.8,
      needsConfirm: true,
      confirmText: ko ? "봇 일시정지" : "Pause bot",
    };
  }

  if (lower.includes("resume") || lower.includes("재개") || lower.includes("다시 시작")) {
    return {
      type: "resume_bot",
      botKey: botKey,
      args: {},
      confidence: 0.8,
      needsConfirm: true,
      confirmText: ko ? "봇 재개" : "Resume bot",
    };
  }

  if ((lower.includes("switch") || lower.includes("전환")) && (lower.includes("bot") || lower.includes("봇"))) {
    const botNames = context.availableBotKeys || [];
    const matchedKey = botNames.find(k => lower.includes(k.toLowerCase()));
    return {
      type: "switch_bot",
      botKey: matchedKey || botKey,
      args: { targetBotKey: matchedKey },
      confidence: matchedKey ? 0.9 : 0.6,
      needsConfirm: false,
      confirmText: ko ? `봇 전환: ${matchedKey || "?"}` : `Switch to bot: ${matchedKey || "?"}`,
    };
  }

  if ((lower.includes("소스") || lower.includes("source")) && (lower.includes("추가") || lower.includes("add"))) {
    const urlMatch = message.match(/https?:\/\/[^\s]+/);
    return {
      type: "add_source",
      botKey: botKey,
      args: { url: urlMatch?.[0] || "" },
      confidence: urlMatch ? 0.9 : 0.6,
      needsConfirm: true,
      confirmText: ko ? `소스 추가: ${urlMatch?.[0] || "URL"}` : `Add source: ${urlMatch?.[0] || "URL"}`,
    };
  }

  if ((lower.includes("소스") || lower.includes("source")) && (lower.includes("삭제") || lower.includes("제거") || lower.includes("remove") || lower.includes("delete"))) {
    return {
      type: "remove_source",
      botKey: botKey,
      args: {},
      confidence: 0.6,
      needsConfirm: true,
      confirmText: ko ? "소스 삭제" : "Remove source",
    };
  }

  if (lower.includes("목록") || lower.includes("리스트") || lower.includes("보여줘")) {
    if (lower.includes("봇") || lower.includes("bot")) {
      return {
        type: "list_bots",
        botKey: botKey,
        args: {},
        confidence: 0.85,
        needsConfirm: false,
        confirmText: ko ? "봇 목록 조회" : "List bots",
      };
    }
  }

  if (lower.includes("상태") || lower.includes("점검") || lower.includes("브리핑") || lower.includes("요약")) {
    return {
      type: "bot_status",
      botKey: botKey,
      args: {},
      confidence: 0.8,
      needsConfirm: false,
      confirmText: ko ? "봇 상태 조회" : "Bot status",
    };
  }

  return null;
}

export async function parseCommand(
  userMessage: string,
  context: CommandParseContext
): Promise<ParseResult> {
  if (!isCommandCandidate(userMessage)) {
    return {
      command: {
        type: "chat",
        botKey: null,
        args: { reply: "" },
        confidence: 1.0,
        needsConfirm: false,
        confirmText: "",
      },
      clarificationNeeded: false,
    };
  }

  const prompt = buildCommandParsePrompt(userMessage, context);

  try {
    const parsed = await callLLMWithJsonParsing<ChatCommand>(prompt, 2);

    if (!parsed.type || !isValidType(parsed.type)) {
      parsed.type = "chat";
    }
    if (typeof parsed.confidence !== "number") {
      parsed.confidence = 0.5;
    }
    if (typeof parsed.needsConfirm !== "boolean") {
      parsed.needsConfirm = true;
    }
    if (!parsed.confirmText) {
      parsed.confirmText = getDefaultConfirmText(parsed);
    }
    if (!parsed.args) parsed.args = {};
    if (!parsed.botKey) parsed.botKey = context.activeBotKey;

    if (parsed.confidence < 0.7 && parsed.type !== "chat") {
      let clarificationText: string;
      try {
        const clarifyPrompt = buildClarificationPrompt(userMessage, context);
        const raw = await callLLMWithJsonParsing<{ reply: string }>(clarifyPrompt, 1);
        clarificationText = raw.reply || "어떤 봇에서 어떤 작업을 실행할지 조금 더 구체적으로 말씀해 주세요.";
      } catch {
        clarificationText = "어떤 봇에서 어떤 작업을 실행할지 조금 더 구체적으로 말씀해 주세요.";
      }

      return {
        command: parsed,
        clarificationNeeded: true,
        clarificationText,
      };
    }

    return { command: parsed, clarificationNeeded: false };
  } catch (error) {
    console.error("Command parsing via LLM failed, trying keyword fallback:", error);

    const fallbackCommand = tryKeywordFallback(userMessage, context);
    if (fallbackCommand) {
      console.log("[Fallback] Keyword parser matched:", fallbackCommand.type);
      return { command: fallbackCommand, clarificationNeeded: false };
    }

    return {
      command: {
        type: "chat",
        botKey: null,
        args: { reply: "AI 파서가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.\n\n직접 명령어를 입력할 수도 있습니다:\n• \"자료 수집해줘\" — 소스에서 자료 수집\n• \"분석해줘\" — 수집된 자료 분석\n• \"리포트 작성해줘\" — 리포트 생성\n• \"수집하고 분석해서 리포트 작성해줘\" — 전체 파이프라인 실행" },
        confidence: 0,
        needsConfirm: false,
        confirmText: "",
      },
      clarificationNeeded: false,
    };
  }
}

function isValidType(type: string): type is ChatCommandType {
  return [
    "list_bots", "switch_bot", "bot_status", "run_now",
    "pause_bot", "resume_bot", "add_source", "remove_source",
    "pipeline_run", "chat",
  ].includes(type);
}

function getDefaultConfirmText(cmd: ChatCommand): string {
  const bot = cmd.botKey || "current bot";
  switch (cmd.type) {
    case "run_now": return `${bot}: run ${cmd.args?.job || "job"}`;
    case "pipeline_run": {
      const schedule = cmd.args?.scheduleTimeLocal ? ` (${cmd.args.scheduleTimeLocal} schedule)` : "";
      return `${bot}: 자료 수집 → 분석 → 리포트 생성${schedule}`;
    }
    case "pause_bot": return `Pause ${bot}`;
    case "resume_bot": return `Resume ${bot}`;
    case "add_source": return `Add source to ${bot}: ${cmd.args?.url || ""}`;
    case "remove_source": return `Remove source from ${bot}: ${cmd.args?.sourceName || ""}`;
    default: return "";
  }
}
