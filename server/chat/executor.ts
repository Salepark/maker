import { Command, GenerateReportCommand, RunPipelineCommand, SetPreferenceCommand, HelpCommand } from "./command-parser";
import { runCollectNow, runAnalyzeNow, runDraftNow, runDailyBriefNow } from "../jobs/scheduler";
import { storage } from "../storage";

interface ExecutionResult {
  ok: boolean;
  assistantMessage: string;
  executed: Command;
  result: any;
}

const VALID_TOPICS = ["ai_art", "investing"];
const MIN_MAX_ITEMS = 5;
const MAX_MAX_ITEMS = 30;
const MIN_LOOKBACK = 1;
const MAX_LOOKBACK = 168;

function validateTopic(topic: string): boolean {
  return VALID_TOPICS.includes(topic);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function executeGenerateReport(cmd: GenerateReportCommand): Promise<ExecutionResult> {
  if (!validateTopic(cmd.topic)) {
    return {
      ok: false,
      assistantMessage: `잘못된 토픽입니다. ai_art 또는 investing을 선택해주세요.`,
      executed: cmd,
      result: null
    };
  }

  const lookbackHours = clamp(cmd.lookbackHours || 24, MIN_LOOKBACK, MAX_LOOKBACK);
  const maxItems = clamp(cmd.maxItems || 12, MIN_MAX_ITEMS, MAX_MAX_ITEMS);

  try {
    const result = await runDailyBriefNow(cmd.topic, lookbackHours, maxItems);
    
    const topicLabel = cmd.topic === "ai_art" ? "AI Art" : "Investing";
    return {
      ok: true,
      assistantMessage: `${topicLabel} Daily Brief를 생성했습니다. (reportId=${result.id}, ${result.itemsCount}개 아이템 분석)`,
      executed: { ...cmd, lookbackHours, maxItems },
      result: { reportId: result.id, itemsCount: result.itemsCount }
    };
  } catch (error: any) {
    return {
      ok: false,
      assistantMessage: `리포트 생성 실패: ${error?.message || String(error)}`,
      executed: cmd,
      result: null
    };
  }
}

async function executeRunPipeline(cmd: RunPipelineCommand): Promise<ExecutionResult> {
  const validJobs = ["collect", "analyze", "draft"];
  const jobStr = String(cmd.job);
  
  if (!validJobs.includes(jobStr)) {
    if (jobStr === "report") {
      return {
        ok: false,
        assistantMessage: `리포트 생성은 'generate_report' 명령을 사용해주세요. 예: 'ai_art 리포트 만들어줘'`,
        executed: cmd,
        result: null
      };
    }
    return {
      ok: false,
      assistantMessage: `잘못된 작업입니다. collect, analyze, draft 중 선택해주세요.`,
      executed: cmd,
      result: null
    };
  }

  try {
    let result: any;
    let message: string;

    switch (cmd.job) {
      case "collect":
        result = await runCollectNow();
        message = `수집 완료: ${result.totalCollected}개 새 아이템`;
        break;
      case "analyze":
        result = await runAnalyzeNow();
        message = `분석 완료: ${result}개 아이템 분석됨`;
        break;
      case "draft":
        result = await runDraftNow();
        message = `드래프트 완료: ${result}개 드래프트 생성됨`;
        break;
      default:
        message = "알 수 없는 작업";
        result = null;
    }

    return {
      ok: true,
      assistantMessage: message,
      executed: cmd,
      result
    };
  } catch (error: any) {
    return {
      ok: false,
      assistantMessage: `작업 실행 실패: ${error?.message || String(error)}`,
      executed: cmd,
      result: null
    };
  }
}

function validateTimeFormat(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time);
}

const VALID_THRESHOLD_PROFILES = ["default", "strict", "relaxed"];

async function executeSetPreference(cmd: SetPreferenceCommand): Promise<ExecutionResult> {
  const validKeys = ["default_topic", "daily_brief_time_kst", "draft_threshold_profile"];
  if (!validKeys.includes(cmd.key)) {
    return {
      ok: false,
      assistantMessage: `잘못된 설정 키입니다.`,
      executed: cmd,
      result: null
    };
  }

  if (cmd.key === "default_topic" && !validateTopic(String(cmd.value))) {
    return {
      ok: false,
      assistantMessage: `잘못된 토픽입니다. ai_art 또는 investing을 선택해주세요.`,
      executed: cmd,
      result: null
    };
  }

  if (cmd.key === "daily_brief_time_kst" && !validateTimeFormat(String(cmd.value))) {
    return {
      ok: false,
      assistantMessage: `잘못된 시간 형식입니다. HH:MM 형식으로 입력해주세요 (예: 22:00).`,
      executed: cmd,
      result: null
    };
  }

  if (cmd.key === "draft_threshold_profile" && !VALID_THRESHOLD_PROFILES.includes(String(cmd.value))) {
    return {
      ok: false,
      assistantMessage: `잘못된 프로필입니다. default, strict, relaxed 중 선택해주세요.`,
      executed: cmd,
      result: null
    };
  }

  try {
    await storage.setSetting(cmd.key, String(cmd.value));
    
    const keyLabel: Record<string, string> = {
      default_topic: "기본 토픽",
      daily_brief_time_kst: "Daily Brief 생성 시간",
      draft_threshold_profile: "드래프트 임계값 프로필"
    };

    return {
      ok: true,
      assistantMessage: `${keyLabel[cmd.key]}을 '${cmd.value}'으로 설정했습니다.`,
      executed: cmd,
      result: { key: cmd.key, value: cmd.value }
    };
  } catch (error: any) {
    return {
      ok: false,
      assistantMessage: `설정 저장 실패: ${error?.message || String(error)}`,
      executed: cmd,
      result: null
    };
  }
}

function executeHelp(cmd: HelpCommand): ExecutionResult {
  const helpMessage = cmd.message || `사용 가능한 명령어 예시:
- "ai_art 리포트 만들어줘"
- "investing으로 지난 48시간 daily brief 재생성"
- "analyze 다시 돌려줘"
- "오늘은 수집만 실행"
- "기본 토픽을 investing으로 설정해줘"`;

  return {
    ok: true,
    assistantMessage: helpMessage,
    executed: cmd,
    result: null
  };
}

const ALLOWED_ACTIONS = ["generate_report", "run_pipeline", "set_preference", "help"];

export async function executeCommand(cmd: Command): Promise<ExecutionResult> {
  if (!cmd || !cmd.action || !ALLOWED_ACTIONS.includes(cmd.action)) {
    return {
      ok: false,
      assistantMessage: "허용되지 않은 명령입니다. 도움말을 요청해보세요.",
      executed: { action: "help", message: "Unknown command" } as HelpCommand,
      result: null
    };
  }

  switch (cmd.action) {
    case "generate_report":
      return executeGenerateReport(cmd);
    case "run_pipeline":
      return executeRunPipeline(cmd);
    case "set_preference":
      return executeSetPreference(cmd);
    case "help":
      return executeHelp(cmd);
    default:
      return {
        ok: false,
        assistantMessage: "알 수 없는 명령입니다.",
        executed: cmd,
        result: null
      };
  }
}
