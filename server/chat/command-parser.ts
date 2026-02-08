import { callLLMWithJsonParsing } from "../llm/client";
import { buildCommandParsePrompt, buildClarificationPrompt, type CommandParseContext } from "../llm/prompts_chat";
import type { ChatCommand, ChatCommandType } from "@shared/chatCommand";

export type { ChatCommand, ChatCommandType };
export type { CommandParseContext };

const COMMAND_HINT_KEYWORDS = [
  "add", "delete", "run", "now", "immediately", "schedule",
  "pause", "resume", "status", "list", "switch",
  "bot", "source", "collect", "analyze", "draft", "report",
  "stop", "halt", "start", "enable", "disable",
  "remove",
  "수집", "분석", "리포트", "보고서", "제출", "모아", "정리",
  "스케줄", "매일", "아침", "저녁", "오전", "오후",
  "pipeline", "자동", "실행", "돌려",
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
        clarificationText = raw.reply || "Could you please be more specific about which bot and what action you'd like to perform?";
      } catch {
        clarificationText = "Could you please be more specific about which bot and what action you'd like to perform?";
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
        args: { reply: "I couldn't understand your request. Please try again." },
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
