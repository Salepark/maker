import cron from "node-cron";
import { collectAllSources } from "../services/rss";
import { analyzeNewItems } from "./analyze_items";
import { draftForAnalyzed } from "./draft_replies";
import { generateDailyBrief } from "./generate_daily_brief";

let collectTask: cron.ScheduledTask | null = null;
let analyzeTask: cron.ScheduledTask | null = null;
let draftTask: cron.ScheduledTask | null = null;
let dailyBriefTask: cron.ScheduledTask | null = null;
let isRunning = false;

let lastCollect: Date | null = null;
let lastAnalyze: Date | null = null;
let lastDraft: Date | null = null;
let lastDailyBrief: Date | null = null;

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
    console.log("📊 Running Daily Brief generation job...");
    try {
      const result = await generateDailyBrief({
        lookbackHours: 24,
        maxItems: 12,
        topic: "investing",
      });
      lastDailyBrief = new Date();
      console.log(`✓ Generated Daily Brief: reportId=${result.id}, items=${result.itemsCount}`);
    } catch (error) {
      console.error("Daily Brief generation failed:", error);
    }
  }, { timezone: tz });

  isRunning = true;
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
  isRunning = false;
  console.log("🕒 Scheduler stopped");
}

export function getSchedulerStatus() {
  return {
    isRunning,
    collectInterval: "10 minutes",
    analyzeInterval: "5 minutes",
    draftInterval: "5 minutes",
    dailyBriefSchedule: process.env.DAILY_BRIEF_CRON || "0 22 * * * (KST)",
    lastCollect: lastCollect?.toISOString(),
    lastAnalyze: lastAnalyze?.toISOString(),
    lastDraft: lastDraft?.toISOString(),
    lastDailyBrief: lastDailyBrief?.toISOString(),
  };
}

export async function runCollectNow() {
  console.log("🔄 Manual RSS collection triggered...");
  const result = await collectAllSources();
  lastCollect = new Date();
  return result;
}

export async function runAnalyzeNow() {
  console.log("🔍 Manual analysis triggered...");
  const count = await analyzeNewItems();
  lastAnalyze = new Date();
  return count;
}

export async function runDraftNow() {
  console.log("✏️ Manual draft generation triggered...");
  const count = await draftForAnalyzed();
  lastDraft = new Date();
  return count;
}

export async function runDailyBriefNow() {
  console.log("📊 Manual Daily Brief generation triggered...");
  const result = await generateDailyBrief({
    lookbackHours: 24,
    maxItems: 12,
    topic: "investing",
    force: true,
  });
  lastDailyBrief = new Date();
  return result;
}
