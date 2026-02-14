import cron from "node-cron";
import { collectAllSources } from "../services/rss";
import { analyzeNewItems } from "./analyze_items";
import { draftForAnalyzed } from "./draft_replies";
import { generateDailyBrief } from "./generate_daily_brief";
import { generateReportsForDueProfiles, generateReportForProfile } from "./report";
import { hasSystemLLMKey } from "../llm/client";

let collectTask: ReturnType<typeof cron.schedule> | null = null;
let analyzeTask: ReturnType<typeof cron.schedule> | null = null;
let draftTask: ReturnType<typeof cron.schedule> | null = null;
let dailyBriefTask: ReturnType<typeof cron.schedule> | null = null;
let reportTask: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

let lastCollect: Date | null = null;
let lastAnalyze: Date | null = null;
let lastDraft: Date | null = null;
let lastDailyBrief: Date | null = null;
let lastReportRun: Date | null = null;

export function startScheduler() {
  if (isRunning) {
    console.log("Scheduler already running");
    return;
  }

  collectTask = cron.schedule("*/10 * * * *", async () => {
    console.log("🔄 Running RSS collection job...");
    try {
      const result = await collectAllSources();
      lastCollect = new Date();
      console.log(`✓ Collected ${result.totalCollected} items from ${result.sourcesProcessed} sources`);
    } catch (error) {
      console.error("RSS collection failed:", error);
    }
  });

  analyzeTask = cron.schedule("*/5 * * * *", async () => {
    if (!hasSystemLLMKey()) return;
    console.log("🔍 Running analysis job...");
    try {
      const count = await analyzeNewItems();
      lastAnalyze = new Date();
      console.log(`✓ Analyzed ${count} items`);
    } catch (error) {
      console.error("Analysis job failed:", error);
    }
  });

  draftTask = cron.schedule("*/5 * * * *", async () => {
    if (!hasSystemLLMKey()) return;
    console.log("✏️ Running draft generation job...");
    try {
      const count = await draftForAnalyzed();
      lastDraft = new Date();
      console.log(`✓ Generated drafts for ${count} items`);
    } catch (error) {
      console.error("Draft generation failed:", error);
    }
  });

  const tz = process.env.REPORT_TZ || "Asia/Seoul";
  const dailyBriefCron = process.env.DAILY_BRIEF_CRON || "0 22 * * *";
  
  console.log(`[Scheduler] Daily Brief scheduled: "${dailyBriefCron}" (${tz})`);
  
  dailyBriefTask = cron.schedule(dailyBriefCron, async () => {
    if (!hasSystemLLMKey()) { console.log("[DailyBrief] Skipped: no system LLM key"); return; }
    console.log("📊 Running Daily Brief generation job (delegated to profile-based report job)...");
    try {
      const results = await generateReportsForDueProfiles();
      lastDailyBrief = new Date();
      console.log(`✓ Generated ${results.length} report(s) via profile-based system`);
    } catch (error) {
      console.error("Daily Brief generation failed:", error);
    }
  }, { timezone: tz });

  reportTask = cron.schedule("*/5 * * * *", async () => {
    if (!hasSystemLLMKey()) return;
    try {
      const results = await generateReportsForDueProfiles();
      lastReportRun = new Date();
      if (results.length > 0) {
        console.log(`✓ Generated ${results.length} profile reports`);
      }
    } catch (error) {
      console.error("Profile Report generation failed:", error);
    }
  });

  isRunning = true;
  if (!hasSystemLLMKey()) {
    console.log("[Scheduler] LLM_API_KEY not set. Collect job runs normally. Analyze/Draft/Report/DailyBrief jobs paused until system key is provided or bots use their own providers.");
  }
  console.log("🕒 Scheduler started");
}

export function stopScheduler() {
  if (!isRunning) {
    console.log("Scheduler not running");
    return;
  }

  collectTask?.stop();
  analyzeTask?.stop();
  draftTask?.stop();
  dailyBriefTask?.stop();
  reportTask?.stop();
  isRunning = false;
  console.log("🕒 Scheduler stopped");
}

export function getSchedulerStatus() {
  const systemLLMAvailable = hasSystemLLMKey();
  return {
    isRunning,
    systemLLMAvailable,
    collectInterval: "10 minutes",
    analyzeInterval: systemLLMAvailable ? "5 minutes" : "paused (no system LLM key)",
    draftInterval: systemLLMAvailable ? "5 minutes" : "paused (no system LLM key)",
    reportInterval: "5 minutes (profile-based)",
    dailyBriefSchedule: systemLLMAvailable ? (process.env.DAILY_BRIEF_CRON || "0 22 * * * (KST)") : "paused (no system LLM key)",
    lastCollect: lastCollect?.toISOString(),
    lastAnalyze: lastAnalyze?.toISOString(),
    lastDraft: lastDraft?.toISOString(),
    lastDailyBrief: lastDailyBrief?.toISOString(),
    lastReportRun: lastReportRun?.toISOString(),
  };
}

export async function runCollectNow() {
  console.log("🔄 Manual RSS collection triggered...");
  const result = await collectAllSources();
  lastCollect = new Date();
  return result;
}

export async function runAnalyzeNow() {
  if (!hasSystemLLMKey()) throw new Error("LLM_API_KEY is not configured. Set it in environment or assign an LLM provider to your bot.");
  console.log("🔍 Manual analysis triggered...");
  const count = await analyzeNewItems();
  lastAnalyze = new Date();
  return count;
}

export async function runDraftNow() {
  if (!hasSystemLLMKey()) throw new Error("LLM_API_KEY is not configured. Set it in environment or assign an LLM provider to your bot.");
  console.log("✏️ Manual draft generation triggered...");
  const count = await draftForAnalyzed();
  lastDraft = new Date();
  return count;
}

export async function runDailyBriefNow(topic: string = "general", lookbackHours: number = 24, maxItems: number = 12) {
  if (!hasSystemLLMKey()) throw new Error("LLM_API_KEY is not configured. Set it in environment or assign an LLM provider to your bot.");
  console.log(`📊 Manual Daily Brief generation triggered for topic=${topic}, lookback=${lookbackHours}h, max=${maxItems}...`);
  const result = await generateDailyBrief({
    lookbackHours,
    maxItems,
    topic,
    force: true,
  });
  lastDailyBrief = new Date();
  return result;
}

export async function runReportNow(profileId?: number, userId?: string) {
  if (!hasSystemLLMKey()) throw new Error("LLM_API_KEY is not configured. Set it in environment or assign an LLM provider to your bot.");
  console.log(`📊 Manual Report generation triggered${profileId ? ` for profile ${profileId}` : " for all due profiles"}...`);
  if (profileId) {
    const result = await generateReportForProfile(profileId, userId);
    lastReportRun = new Date();
    return result;
  } else {
    const results = await generateReportsForDueProfiles();
    lastReportRun = new Date();
    return results;
  }
}
