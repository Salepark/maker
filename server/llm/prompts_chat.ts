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
  "type": "list_bots | switch_bot | bot_status | run_now | pause_bot | resume_bot | add_source | remove_source | pipeline_run | chat",
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
4) run_now: Run a SINGLE step only (collect/analyze/draft/report). args: { "job": "collect" | "analyze" | "draft" | "report", "lookbackHours": number (report only), "maxItems": number (report only) }. botKey needed (uses active bot if not specified).
5) pause_bot: Pause bot schedule. args: {}. botKey required.
6) resume_bot: Resume bot schedule. args: {}. botKey required.
7) add_source: Add RSS source. args: { "url": "RSS URL", "name": "source name (optional)" }. botKey needed (uses active bot if not specified).
8) remove_source: Remove source. args: { "sourceName": "source name or URL" }. botKey needed (uses active bot if not specified).
9) pipeline_run: Run the FULL pipeline (collect → analyze → report) in one command. Use this when the user wants to collect data AND analyze AND generate a report in a single request. If the user also mentions a schedule time, include it in args. args: { "scheduleTimeLocal": "HH:MM" (optional), "scheduleRule": "DAILY" | "WEEKDAYS" | "WEEKENDS" (optional, default DAILY), "lookbackHours": number (optional), "maxItems": number (optional) }. botKey needed (uses active bot if not specified).
10) chat: General conversation or when the request does not match any command above. args: { "reply": "natural language response" }

[Pipeline Detection Rules]
- If the user mentions TWO or MORE of: collecting/gathering data, analyzing, generating report → use pipeline_run
- Korean examples: "수집하고 분석해서 리포트", "자료 모아서 정리해줘", "데이터 수집 후 보고서 만들어줘"
- Schedule parsing: "아침 9시" → scheduleTimeLocal: "09:00", "오후 3시" → "15:00", "저녁 7시" → "19:00", "매일 아침" → scheduleRule: "DAILY"
- If ONLY one step is mentioned (e.g., just "수집해줘" or just "리포트 만들어줘"), use run_now instead

[Rules]
- If botKey is not specified and there is an active bot, use the active bot's key
- confidence: 0.9 or higher if the request is clear, 0.5~0.7 if ambiguous
- needsConfirm: true for data-changing commands (run_now, pause_bot, resume_bot, add_source, remove_source, pipeline_run). false for read-only commands (list_bots, bot_status). false for switch_bot.
- confirmText: Keep it concise and user-friendly. For pipeline_run, use format like "자료 수집 → 분석 → 리포트 생성 (09:00 매일)"
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
