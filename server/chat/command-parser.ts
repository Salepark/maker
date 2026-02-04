import { callLLMWithJsonParsing } from "../llm/client";

export interface GenerateReportCommand {
  action: "generate_report";
  topic: "ai_art" | "investing";
  lookbackHours: number;
  maxItems: number;
  reportType: "daily_brief";
  force: boolean;
}

export interface RunPipelineCommand {
  action: "run_pipeline";
  job: "collect" | "analyze" | "draft" | "report";
  topic?: "ai_art" | "investing";
  limit?: number;
}

export interface SetPreferenceCommand {
  action: "set_preference";
  key: "default_topic" | "daily_brief_time_kst" | "draft_threshold_profile";
  value: string | number;
}

export interface HelpCommand {
  action: "help";
  message: string;
}

export type Command = GenerateReportCommand | RunPipelineCommand | SetPreferenceCommand | HelpCommand;

interface CommandContext {
  default_topic: string;
  daily_brief_time_kst: string;
}

function buildCommandParsePrompt(userMessage: string, context: CommandContext): string {
  return `너는 앱의 "명령 파서"다. 사용자의 자연어 요청을 아래 허용된 명령(JSON) 중 하나로 변환하라.
반드시 JSON만 출력하라. 설명 문장 금지.

[허용 action]
1) generate_report: { "action": "generate_report", "topic": "ai_art" | "investing", "lookbackHours": number, "maxItems": number, "reportType": "daily_brief", "force": boolean }
2) run_pipeline: { "action": "run_pipeline", "job": "collect" | "analyze" | "draft" | "report", "topic": "ai_art" | "investing" (optional), "limit": number (optional) }
3) set_preference: { "action": "set_preference", "key": "default_topic" | "daily_brief_time_kst" | "draft_threshold_profile", "value": string | number }
4) help: { "action": "help", "message": "도움말 메시지" }

[규칙]
- topic이 명시되지 않으면 default_topic을 사용: "${context.default_topic}"
- "미국 시장 개장 전"은 report 생성 시간 힌트로만 사용(스케줄 변경은 set_preference로)
- "다시/재생성/force"는 force=true
- lookbackHours: "지난 2일"=48, "지난 1주"=168, 기본=24
- maxItems 기본 12 (사용자가 지정하면 반영), 범위 5~30
- reportType은 항상 "daily_brief"
- 애매하거나 허용되지 않은 요청은 help로 응답

[context]
default_topic=${context.default_topic}
daily_brief_time_kst=${context.daily_brief_time_kst}

[사용자 메시지]
${userMessage}`;
}

export async function parseCommand(userMessage: string, context: CommandContext): Promise<Command> {
  const prompt = buildCommandParsePrompt(userMessage, context);
  
  try {
    const command = await callLLMWithJsonParsing<Command>(prompt, 2);
    return command;
  } catch (error) {
    console.error("Command parsing failed:", error);
    return {
      action: "help",
      message: "요청을 이해하지 못했습니다. 다음 명령을 시도해보세요:\n- 'ai_art 리포트 만들어줘'\n- 'investing 리포트 지금 만들어줘'\n- 'analyze 실행해줘'"
    };
  }
}
