export interface CommandParseContext {
  activeBotKey: string | null;
  availableBotKeys: string[];
}

export function buildCommandParsePrompt(userMessage: string, context: CommandParseContext): string {
  const botList = context.availableBotKeys.length > 0
    ? context.availableBotKeys.join(", ")
    : "(none)";
  const activeBot = context.activeBotKey || "(none)";

  return `You are the "command parser" for a bot manager app. Convert the user's natural language request into one of the allowed commands (JSON) below.
Output JSON only. No explanatory sentences.

[Output Schema]
{
  "type": "list_bots | switch_bot | bot_status | run_now | pause_bot | resume_bot | add_source | remove_source | chat",
  "botKey": "bot key (null if none)",
  "args": {},
  "confidence": 0.0~1.0,
  "needsConfirm": true/false,
  "confirmText": "one-line execution summary to show the user"
}

[Allowed Commands]
1) list_bots: View my bot list. args: {}
2) switch_bot: Switch the active bot for conversation. args: {}. botKey required.
3) bot_status: Bot status/schedule/source summary. args: {}. botKey needed (uses active bot if not specified).
4) run_now: Run collect/analyze/draft/report. args: { "job": "collect" | "analyze" | "draft" | "report", "lookbackHours": number (report only), "maxItems": number (report only) }. botKey needed (uses active bot if not specified).
5) pause_bot: Pause bot schedule. args: {}. botKey required.
6) resume_bot: Resume bot schedule. args: {}. botKey required.
7) add_source: Add RSS source. args: { "url": "RSS URL", "name": "source name (optional)" }. botKey needed (uses active bot if not specified).
8) remove_source: Remove source. args: { "sourceName": "source name or URL" }. botKey needed (uses active bot if not specified).
9) chat: General conversation or when the request does not match any command above. args: { "reply": "natural language response" }

[Rules]
- If botKey is not specified and there is an active bot, use the active bot's key
- confidence: 0.9 or higher if the request is clear, 0.5~0.7 if ambiguous
- needsConfirm: true for data-changing commands (run_now, pause_bot, resume_bot, add_source, remove_source). false for read-only commands (list_bots, bot_status). false for switch_bot.
- confirmText: Keep it concise, e.g. "Adding source to ai_art bot: Reuters Business"
- For ambiguous or disallowed requests, use type="chat"

[Current State]
Active bot: ${activeBot}
Available bots: ${botList}

[User Message]
${userMessage}`;
}

export function buildClarificationPrompt(userMessage: string, context: CommandParseContext): string {
  const activeBot = context.activeBotKey || "(none)";
  const botList = context.availableBotKeys.length > 0
    ? context.availableBotKeys.join(", ")
    : "(none)";

  return `You are a helper for a bot manager app. The user's request is ambiguous and you cannot determine the exact command.
Ask a brief clarifying question in 1-2 sentences.

[Current State]
Active bot: ${activeBot}
Available bots: ${botList}

[User Message]
${userMessage}

[Available Commands]
Bot list, switch bot, bot status, run collect/analyze/draft/report, pause, resume, add source, remove source

Ask a brief clarifying question:`;
}
