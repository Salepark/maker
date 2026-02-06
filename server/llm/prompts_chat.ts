export interface CommandParseContext {
  activeBotKey: string | null;
  availableBotKeys: string[];
}

export function buildCommandParsePrompt(userMessage: string, context: CommandParseContext): string {
  const botList = context.availableBotKeys.length > 0
    ? context.availableBotKeys.join(", ")
    : "(없음)";
  const activeBot = context.activeBotKey || "(없음)";

  return `너는 봇 매니저 앱의 "명령 파서"다. 사용자의 자연어 요청을 아래 허용된 명령(JSON) 중 하나로 변환하라.
반드시 JSON만 출력하라. 설명 문장 금지.

[출력 스키마]
{
  "type": "list_bots | switch_bot | bot_status | run_now | pause_bot | resume_bot | add_source | remove_source | chat",
  "botKey": "봇 key (없으면 null)",
  "args": {},
  "confidence": 0.0~1.0,
  "needsConfirm": true/false,
  "confirmText": "사용자에게 보여줄 한 줄 실행 요약"
}

[허용 명령]
1) list_bots: 내 봇 목록 보기. args: {}
2) switch_bot: 대화 대상 봇 변경. args: {}. botKey 필수.
3) bot_status: 봇 상태/스케줄/소스 요약. args: {}. botKey 필요(없으면 활성 봇).
4) run_now: 수집/분석/초안/리포트 실행. args: { "job": "collect" | "analyze" | "draft" | "report", "lookbackHours": number (리포트만), "maxItems": number (리포트만) }. botKey 필요(없으면 활성 봇).
5) pause_bot: 봇 스케줄 일시정지. args: {}. botKey 필요.
6) resume_bot: 봇 스케줄 재개. args: {}. botKey 필요.
7) add_source: RSS 소스 추가. args: { "url": "RSS URL", "name": "소스 이름(선택)" }. botKey 필요(없으면 활성 봇).
8) remove_source: 소스 제거. args: { "sourceName": "소스 이름 또는 URL" }. botKey 필요(없으면 활성 봇).
9) chat: 일반 대화 또는 위 명령에 해당하지 않는 경우. args: { "reply": "자연어 답변" }

[규칙]
- botKey가 명시되지 않고 활성 봇이 있으면 활성 봇의 key를 사용
- confidence: 요청이 명확하면 0.9 이상, 모호하면 0.5~0.7
- needsConfirm: 데이터 변경 명령(run_now, pause_bot, resume_bot, add_source, remove_source)은 true. 조회 명령(list_bots, bot_status)은 false. switch_bot은 false.
- confirmText: "ai_art 봇에 소스를 추가합니다: Reuters Business" 같이 간결하게
- 애매하거나 허용되지 않은 요청은 type="chat"으로

[현재 상태]
활성 봇: ${activeBot}
사용 가능한 봇: ${botList}

[사용자 메시지]
${userMessage}`;
}

export function buildClarificationPrompt(userMessage: string, context: CommandParseContext): string {
  const activeBot = context.activeBotKey || "(없음)";
  const botList = context.availableBotKeys.length > 0
    ? context.availableBotKeys.join(", ")
    : "(없음)";

  return `너는 봇 매니저 앱의 도우미다. 사용자의 요청이 모호해서 명령을 정확히 판단할 수 없다.
짧게 한국어로 되물어서 명확히 해줘. 1~2문장만.

[현재 상태]
활성 봇: ${activeBot}
사용 가능한 봇: ${botList}

[사용자 메시지]
${userMessage}

[가능한 명령]
봇 목록, 봇 전환, 봇 상태, 수집/분석/초안/리포트 실행, 일시정지, 재개, 소스 추가, 소스 제거

짧게 되물어줘:`;
}
