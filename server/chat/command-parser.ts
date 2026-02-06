import { callLLMWithJsonParsing } from "../llm/client";
import { buildCommandParsePrompt, buildClarificationPrompt, type CommandParseContext } from "../llm/prompts_chat";
import type { ChatCommand, ChatCommandType } from "@shared/chatCommand";

export type { ChatCommand, ChatCommandType };
export type { CommandParseContext };

const COMMAND_HINT_KEYWORDS = [
  "추가", "삭제", "실행", "지금", "바로", "스케줄",
  "일시정지", "재개", "상태", "목록", "전환",
  "봇", "소스", "수집", "분석", "초안", "리포트",
  "멈춰", "중지", "켜", "꺼", "pause", "resume",
  "list", "switch", "status", "run", "add", "remove",
  "source", "bot", "report", "collect", "analyze", "draft",
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
        clarificationText = raw.reply || "어떤 봇에서 어떤 작업을 하시려는 건지 좀 더 구체적으로 말씀해주세요.";
      } catch {
        clarificationText = "어떤 봇에서 어떤 작업을 하시려는 건지 좀 더 구체적으로 말씀해주세요.";
      }

      return {
        command: parsed,
        clarificationNeeded: true,
        clarificationText,
      };
    }

    return { command: parsed, clarificationNeeded: false };
  } catch (error) {
    console.error("Command parsing failed:", error);
    return {
      command: {
        type: "chat",
        botKey: null,
        args: { reply: "요청을 이해하지 못했습니다. 다시 시도해주세요." },
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
    "pause_bot", "resume_bot", "add_source", "remove_source", "chat",
  ].includes(type);
}

function getDefaultConfirmText(cmd: ChatCommand): string {
  const bot = cmd.botKey || "현재 봇";
  switch (cmd.type) {
    case "run_now": return `${bot}: ${cmd.args?.job || "작업"} 실행`;
    case "pause_bot": return `${bot} 일시정지`;
    case "resume_bot": return `${bot} 재개`;
    case "add_source": return `${bot}에 소스 추가: ${cmd.args?.url || ""}`;
    case "remove_source": return `${bot}에서 소스 제거: ${cmd.args?.sourceName || ""}`;
    default: return "";
  }
}
