import { storage } from "../storage";
import { hasSystemLLMKey } from "../llm/client";
import type { Bot } from "@shared/schema";

export interface DiagnosticItem {
  rule: string;
  severity: "error" | "warning" | "info";
  messageEn: string;
  messageKo: string;
}

export interface DiagnosisResult {
  health: "healthy" | "warning" | "error";
  items: DiagnosticItem[];
}

export async function diagnoseBot(userId: string, bot: Bot): Promise<DiagnosisResult> {
  const items: DiagnosticItem[] = [];

  if (!bot.isEnabled) {
    items.push({
      rule: "BOT_DISABLED",
      severity: "warning",
      messageEn: `Bot '${bot.name}' is paused. Scheduled jobs will not run.`,
      messageKo: `'${bot.name}' 봇이 일시정지되어 있습니다. 예약된 작업이 실행되지 않습니다.`,
    });
  }

  const botSources = await storage.getBotSources(bot.id);
  let hasLinkedSources = botSources.length > 0;

  if (!hasLinkedSources) {
    const profile = await storage.getProfileByUserAndTopic(userId, bot.key);
    if (profile) {
      const profileSourceIds = await storage.getProfileSourceIds(profile.id);
      hasLinkedSources = profileSourceIds.length > 0;
    }
  }

  if (!hasLinkedSources) {
    items.push({
      rule: "NO_SOURCES",
      severity: "error",
      messageEn: `Bot '${bot.name}' has no sources linked. Add sources to start collecting content.`,
      messageKo: `'${bot.name}' 봇에 연결된 소스가 없습니다. 콘텐츠 수집을 위해 소스를 추가하세요.`,
    });
  }

  const botLLM = await storage.resolveLLMForBot(bot.id);
  if (!hasSystemLLMKey() && !botLLM) {
    items.push({
      rule: "NO_LLM",
      severity: "error",
      messageEn: "No AI provider configured. Go to Settings to add your API key.",
      messageKo: "AI 제공자가 설정되지 않았습니다. Settings에서 API 키를 추가하세요.",
    });
  }

  let lastRun = await storage.getLastJobRunForBot(userId, bot.id);

  if (!lastRun) {
    const profile = await storage.getProfileByUserAndTopic(userId, bot.key);
    if (profile) {
      lastRun = await storage.getLastJobRunByBotKey(userId, `profile-${profile.id}`);
    }
  }

  if (lastRun && lastRun.status === "error") {
    const ago = lastRun.finishedAt
      ? Math.round((Date.now() - new Date(lastRun.finishedAt).getTime()) / 60000)
      : null;
    const agoText = ago !== null ? (ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`) : "";
    const agoTextKo = ago !== null ? (ago < 60 ? `${ago}분 전` : `${Math.round(ago / 60)}시간 전`) : "";
    items.push({
      rule: "LAST_RUN_FAILED",
      severity: "error",
      messageEn: `Last run failed${agoText ? ` (${agoText})` : ""}: ${lastRun.errorMessage || lastRun.errorCode || "Unknown error"}`,
      messageKo: `마지막 실행 실패${agoTextKo ? ` (${agoTextKo})` : ""}: ${lastRun.errorMessage || lastRun.errorCode || "알 수 없는 오류"}`,
    });
  }

  if (!lastRun && bot.isEnabled && hasLinkedSources) {
    items.push({
      rule: "NEVER_RAN",
      severity: "info",
      messageEn: `Bot '${bot.name}' has never run. Try running it from the Console or wait for the next schedule.`,
      messageKo: `'${bot.name}' 봇이 아직 한 번도 실행되지 않았습니다. Console에서 실행하거나 다음 예약 시간을 기다려주세요.`,
    });
  }

  const errorCount = items.filter(i => i.severity === "error").length;
  const warningCount = items.filter(i => i.severity === "warning").length;
  const health: DiagnosisResult["health"] = errorCount > 0 ? "error" : warningCount > 0 ? "warning" : "healthy";

  return { health, items };
}
