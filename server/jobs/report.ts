import { storage } from "../storage";
import { callLLM, callLLMWithConfig, callLLMWithTimeout, hasSystemLLMKey, type LLMConfig } from "../llm/client";
import { buildDailyBriefPrompt, ReportConfig } from "../llm/prompts";
import { analyzeNewItemsBySourceIds } from "./analyze_items";
import { startRun, endRunOk, endRunError, endRunSkipped } from "./runLogger";

interface ReportJobResult {
  profileId: number;
  reportId: number;
  itemsCount: number;
  topic: string;
}

async function callLLMForProfile(prompt: string, userId: string, topic: string, maxRetries: number = 3, maxTokens: number = 4000): Promise<string> {
  const botLLM = await storage.resolveLLMForProfile(userId, topic);
  if (botLLM) {
    console.log(`[ReportJob] Using bot-specific LLM: ${botLLM.providerType} / ${botLLM.model || 'default'}`);
    return callLLMWithConfig(botLLM as LLMConfig, prompt, maxRetries, maxTokens);
  }
  if (hasSystemLLMKey()) {
    console.log(`[ReportJob] No bot LLM configured, using system default`);
    return callLLM(prompt, maxRetries, maxTokens);
  }
  throw new Error("No AI key configured. Please add an AI Provider in Settings or contact your administrator.");
}

function isDueToday(scheduleCron: string, timezone: string, lastRunAt: Date | null): boolean {
  try {
    const now = new Date();

    const options = { timeZone: timezone, hour12: false } as const;
    const formatter = new Intl.DateTimeFormat('en-US', {
      ...options,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);

    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    const currentYear = parts.find(p => p.type === 'year')?.value || '';
    const currentMonth = parts.find(p => p.type === 'month')?.value || '';
    const currentDay = parts.find(p => p.type === 'day')?.value || '';
    const todayKey = `${currentYear}-${currentMonth}-${currentDay}`;

    const weekdayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const currentDow = weekdayMap[weekdayStr] ?? 1;

    const cronParts = scheduleCron.trim().split(/\s+/);
    if (cronParts.length < 5) return false;

    const [cronMinute, cronHour, , , cronDow] = cronParts;

    if (cronDow !== '*') {
      if (cronDow.includes('-')) {
        const [start, end] = cronDow.split('-').map(Number);
        if (currentDow < start || currentDow > end) return false;
      } else if (cronDow.includes(',')) {
        const allowedDays = cronDow.split(',').map(Number);
        if (!allowedDays.includes(currentDow)) return false;
      } else {
        if (currentDow !== parseInt(cronDow)) return false;
      }
    }

    const targetHour = cronHour === '*' ? 0 : parseInt(cronHour);
    const targetMinute = cronMinute === '*' ? 0 : parseInt(cronMinute);
    const scheduledMinuteOfDay = targetHour * 60 + targetMinute;
    const currentMinuteOfDay = currentHour * 60 + currentMinute;

    if (currentMinuteOfDay < scheduledMinuteOfDay) return false;

    if (lastRunAt) {
      const lastRunFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const lastRunParts = lastRunFormatter.formatToParts(lastRunAt);
      const lastRunYear = lastRunParts.find(p => p.type === 'year')?.value || '';
      const lastRunMonth = lastRunParts.find(p => p.type === 'month')?.value || '';
      const lastRunDay = lastRunParts.find(p => p.type === 'day')?.value || '';
      const lastRunKey = `${lastRunYear}-${lastRunMonth}-${lastRunDay}`;

      if (lastRunKey === todayKey) return false;
    }

    return true;
  } catch (error) {
    console.error('[ReportJob] Error in isDueToday:', error);
    return false;
  }
}

export async function generateReportsForDueProfiles(): Promise<ReportJobResult[]> {
  console.log("[ReportJob] Starting report generation for due profiles...");
  
  const activeProfiles = await storage.getActiveReportProfiles();
  
  if (activeProfiles.length === 0) {
    console.log("[ReportJob] No active report profiles found");
    return [];
  }

  console.log(`[ReportJob] Found ${activeProfiles.length} active report profiles`);

  const results: ReportJobResult[] = [];
  const now = new Date();

  for (const profile of activeProfiles) {
    try {
      if (!isDueToday(profile.scheduleCron, profile.timezone, profile.lastRunAt ? new Date(profile.lastRunAt) : null)) {
        continue;
      }

      console.log(`[ReportJob] Processing profile: ${profile.name} (id=${profile.id}, topic=${profile.topic})`);

      const userBots = await storage.listBots(profile.userId);
      const matchingBot = userBots.find(b => b.key === profile.topic);

      const runId = await startRun({
        userId: profile.userId,
        botId: matchingBot?.id ?? null,
        botKey: profile.topic,
        jobType: "report",
        trigger: "schedule",
        meta: { profileId: profile.id, scheduleCron: profile.scheduleCron, tz: profile.timezone },
      });

      if (matchingBot && !matchingBot.isEnabled) {
        console.log(`[ReportJob] Bot '${matchingBot.name}' is disabled, skipping profile ${profile.id}`);
        await endRunSkipped(runId, "BOT_DISABLED");
        continue;
      }

      const sourceIds = await storage.getProfileSourceIds(profile.id);
      
      if (sourceIds.length === 0) {
        console.log(`[ReportJob] Profile ${profile.id} has no sources linked, skipping`);
        await endRunSkipped(runId, "NO_SOURCES");
        continue;
      }

      const lookbackHours = 24;
      const periodStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
      const periodEnd = now;

      const exists = await storage.outputExists(profile.id, periodStart, periodEnd);
      if (exists) {
        console.log(`[ReportJob] Report already exists for profile ${profile.id} in this period, skipping`);
        await endRunSkipped(runId, "ALREADY_EXISTS");
        continue;
      }

      const recentItems = await storage.getRecentItemsBySourceIds(sourceIds, lookbackHours, 30);
      const sourceNames = [...new Set(recentItems.map(i => i.sourceName))];

      const fastResult = await generateFastReport({
        profileId: profile.id,
        userId: profile.userId,
        presetId: profile.presetId,
        topic: profile.topic,
        profileName: profile.name,
        sourceIds,
        collectResult: { totalCollected: 0, sourcesProcessed: sourceIds.length },
        sourceNames,
        timezone: profile.timezone || "Asia/Seoul",
      });

      console.log(`[ReportJob] Fast report ${fastResult.reportId} created for profile ${profile.id}, scheduling background upgrade...`);

      await endRunOk(runId, {
        outputId: fastResult.reportId,
        reportStage: "fast",
        itemsCollected: fastResult.itemsCount,
      });

      results.push(fastResult);

      scheduleBackgroundUpgrade(fastResult.reportId, profile.id, profile.userId, sourceIds);

    } catch (error) {
      console.error(`[ReportJob] Failed to generate report for profile ${profile.id}:`, error);
    }
  }

  console.log(`[ReportJob] Completed. Generated ${results.length} reports (fast stage, upgrades in background)`);
  return results;
}

export async function generateReportForProfile(profileId: number, userId?: string): Promise<ReportJobResult | null> {
  console.log(`[ReportJob] Manual generation for profile ${profileId} (fast-first)`);

  const profile = await storage.getProfileById(profileId);

  if (!profile) {
    console.error(`[ReportJob] Profile ${profileId} not found`);
    throw new Error(`Profile not found. Please create a bot from the Template Gallery first.`);
  }

  if (userId && profile.userId !== userId) {
    console.error(`[ReportJob] Profile ${profileId} does not belong to user ${userId}`);
    throw new Error(`Profile does not belong to this user.`);
  }

  const sourceIds = await storage.getProfileSourceIds(profile.id);
  
  if (sourceIds.length === 0) {
    console.error(`[ReportJob] Profile ${profileId} has no sources linked`);
    throw new Error(`No sources linked to this bot. Add sources first using 'add source' command or from the Sources page.`);
  }

  const allSources = await storage.getSources();
  const sourceNames = allSources
    .filter((s: any) => sourceIds.includes(s.id))
    .map((s: any) => s.name);

  const fastResult = await generateFastReport({
    profileId: profile.id,
    userId: profile.userId,
    presetId: profile.presetId,
    topic: profile.topic,
    profileName: profile.name,
    sourceIds,
    collectResult: { totalCollected: 0, sourcesProcessed: 0 },
    sourceNames,
    timezone: profile.timezone || "Asia/Seoul",
  });

  if (fastResult.reportId && fastResult.itemsCount > 0) {
    const botLLM = await storage.resolveLLMForProfile(profile.userId, profile.topic);
    if (hasSystemLLMKey() || botLLM) {
      scheduleBackgroundUpgrade(fastResult.reportId, profile.id, profile.userId, sourceIds);
    }
  }

  console.log(`[ReportJob] Created fast report ${fastResult.reportId} for profile ${profile.id} (${fastResult.itemsCount} items, upgrade scheduled in background)`);

  return fastResult;
}

function buildStatusReport(
  profileName: string,
  today: string,
  recentItems: { title: string | null; sourceName: string; status: string }[],
  sourceCount: number
): string {
  const lines: string[] = [];
  lines.push(`# ${profileName} — ${today}`);
  lines.push("");
  lines.push(`> 상태 리포트`);
  lines.push("");

  if (recentItems.length === 0) {
    lines.push("오늘은 연결된 소스에서 새로운 자료가 수집되지 않았습니다.");
    lines.push("");
    lines.push("**가능한 원인:**");
    lines.push("- 소스 피드에 새 게시물이 아직 없음");
    lines.push("- 소스 URL이 올바르지 않거나 일시적으로 접근 불가");
    lines.push("");
    lines.push(`연결된 소스: ${sourceCount}개`);
  } else {
    const statusCounts: Record<string, number> = {};
    for (const item of recentItems) {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }

    lines.push(`최근 24시간 내 ${recentItems.length}건의 자료가 수집되었습니다.`);
    lines.push("");

    if (statusCounts["new"]) {
      lines.push(`- 수집 완료 (분석 대기): ${statusCounts["new"]}건`);
    }
    if (statusCounts["analyzed"]) {
      lines.push(`- 분석 완료: ${statusCounts["analyzed"]}건`);
    }
    if (statusCounts["skipped"]) {
      lines.push(`- 건너뜀: ${statusCounts["skipped"]}건`);
    }
    lines.push("");

    lines.push("**주요 수집 자료:**");
    const displayItems = recentItems.slice(0, 8);
    for (const item of displayItems) {
      lines.push(`- ${item.title || "(제목 없음)"} (${item.sourceName})`);
    }
    if (recentItems.length > 8) {
      lines.push(`- ...외 ${recentItems.length - 8}건`);
    }
    lines.push("");
    lines.push("심화 분석은 백그라운드에서 진행되며, 완료되면 자동으로 업데이트됩니다.");
  }

  lines.push("");
  lines.push("---");
  lines.push("*메이커는 먼저 빠른 브리핑을 제공합니다. 심화 분석은 백그라운드에서 진행되며, 완료되면 자동으로 업데이트됩니다.*");

  return lines.join("\n");
}

function scheduleBackgroundUpgrade(reportId: number, profileId: number, userId: string, sourceIds: number[]) {
  const maxItems = 12;
  setTimeout(async () => {
    try {
      console.log(`[ReportJob] Background upgrade starting for report ${reportId} (profile ${profileId})...`);

      const newItems = await storage.getItemsByStatusAndSourceIds("new", sourceIds, maxItems);
      if (newItems.length > 0) {
        console.log(`[ReportJob] Background: analyzing ${newItems.length} new items inline...`);
        await analyzeNewItemsBySourceIds(sourceIds, maxItems, 1);
      }

      await upgradeToFullReport(reportId, profileId, userId);
      console.log(`[ReportJob] Background upgrade complete for report ${reportId}`);
    } catch (error) {
      console.error(`[ReportJob] Background upgrade failed for report ${reportId}:`, error);
    }
  }, 2000);
}

export interface FastReportParams {
  profileId: number;
  userId: string;
  presetId: number;
  topic: string;
  profileName: string;
  sourceIds: number[];
  collectResult: { totalCollected: number; sourcesProcessed: number };
  sourceNames: string[];
  timezone?: string;
}

export async function generateFastReport(params: FastReportParams): Promise<ReportJobResult> {
  const {
    profileId, userId, presetId, topic,
    profileName, sourceIds, collectResult, sourceNames,
    timezone = "Asia/Seoul",
  } = params;

  const now = new Date();
  const lookbackHours = 24;
  const periodStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
  const periodEnd = now;

  const today = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: timezone,
  });

  const timeStr = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });

  const recentItems = await storage.getRecentItemsBySourceIds(sourceIds, lookbackHours, 30);

  const lines: string[] = [];
  lines.push(`# ${profileName} — 초기 브리핑`);
  lines.push(`> ${today} ${timeStr} 기준`);
  lines.push("");

  if (collectResult.totalCollected > 0) {
    lines.push(`${collectResult.sourcesProcessed}개 소스에서 **${collectResult.totalCollected}건**의 새 자료를 수집했습니다.`);
  } else if (recentItems.length > 0) {
    lines.push(`기존 수집 자료 ${recentItems.length}건을 기반으로 브리핑합니다.`);
  } else {
    lines.push("현재 수집된 자료가 없습니다.");
  }
  lines.push("");

  if (recentItems.length > 0) {
    lines.push("## 주요 자료 미리보기");
    lines.push("");
    const displayItems = recentItems.slice(0, 10);
    for (const item of displayItems) {
      lines.push(`- **${item.title || "(제목 없음)"}** — ${item.sourceName}`);
    }
    if (recentItems.length > 10) {
      lines.push(`- ...외 ${recentItems.length - 10}건`);
    }
    lines.push("");

    const sourceSummary = new Map<string, number>();
    for (const item of recentItems) {
      sourceSummary.set(item.sourceName, (sourceSummary.get(item.sourceName) || 0) + 1);
    }
    lines.push("## 소스별 수집 현황");
    lines.push("");
    sourceSummary.forEach((count, name) => {
      lines.push(`- ${name}: ${count}건`);
    });
    lines.push("");
  }

  lines.push("---");
  lines.push("*메이커는 먼저 빠른 브리핑을 제공합니다. 심화 분석은 백그라운드에서 진행되며, 완료되면 자동으로 업데이트됩니다.*");

  const content = lines.join("\n");

  const report = await storage.createOutputRecord({
    userId,
    profileId,
    presetId,
    topic,
    outputType: "report",
    title: `${profileName} — 초기 브리핑 (${timeStr})`,
    contentText: content,
    reportStage: "fast",
    periodStart,
    periodEnd,
  });

  await storage.updateProfileLastRunAt(profileId, now);

  console.log(`[ReportJob] Created FAST report ${report.id} for profile ${profileId}`);

  return {
    profileId,
    reportId: report.id,
    itemsCount: recentItems.length,
    topic,
  };
}

export async function upgradeToFullReport(outputId: number, profileId: number, userId?: string): Promise<ReportJobResult | null> {
  console.log(`[ReportJob] Upgrading fast report ${outputId} to full report...`);
  
  const profile = await storage.getProfileById(profileId);
  if (!profile) {
    console.error(`[ReportJob] Profile ${profileId} not found for upgrade`);
    return null;
  }

  const sourceIds = await storage.getProfileSourceIds(profile.id);
  if (sourceIds.length === 0) return null;

  const now = new Date();
  const lookbackHours = 24;
  const maxItems = 12;

  let items = await storage.getItemsForReport(null, sourceIds, lookbackHours, maxItems);

  const config = (profile.configJson || {}) as ReportConfig;
  const minScore = config.filters?.minImportanceScore ?? 0;
  if (minScore > 0) {
    items = items.filter(item => (item.importanceScore || 0) >= minScore);
  }

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: profile.timezone || "Asia/Seoul",
  });

  let content: string;
  let reportStage: string;

  if (items.length === 0) {
    const newItems = await storage.getItemsByStatusAndSourceIds("new", sourceIds, maxItems);
    if (newItems.length > 0) {
      console.log(`[ReportJob] Upgrade: No analyzed items but ${newItems.length} new items found, analyzing inline...`);
      try {
        const analyzedCount = await analyzeNewItemsBySourceIds(sourceIds, maxItems, 1);
        if (analyzedCount > 0) {
          items = await storage.getItemsForReport(null, sourceIds, lookbackHours, maxItems);
          if (minScore > 0) {
            items = items.filter(item => (item.importanceScore || 0) >= minScore);
          }
        }
      } catch (analyzeError) {
        console.error(`[ReportJob] Inline analysis failed during upgrade:`, analyzeError);
      }
    }
  }

  if (items.length === 0) {
    const recentItems = await storage.getRecentItemsBySourceIds(sourceIds, lookbackHours, 20);
    content = buildStatusReport(profile.name, today, recentItems, sourceIds.length);
    reportStage = "status";
  } else {
    const briefItems = items.map((item) => ({
      id: item.id,
      title: item.title || "Untitled",
      url: item.url,
      source: item.sourceName,
      topic: item.topic,
      key_takeaway: "",
      why_it_matters: "",
      impact_scope: {
        equities: item.importanceScore,
        rates_fx: Math.floor(item.importanceScore * 0.7),
        commodities: Math.floor(item.importanceScore * 0.5),
        crypto: Math.floor(item.importanceScore * 0.8),
      },
      risk_flags: [],
      confidence: item.importanceScore,
      category: "general",
    }));

    const prompt = buildDailyBriefPrompt(briefItems, today, profile.topic, config);
    const llmResult = await callLLMWithTimeout(
      () => callLLMForProfile(prompt, profile.userId, profile.topic),
      60000
    );
    if (llmResult) {
      content = llmResult;
      reportStage = "full";
    } else {
      console.warn(`[ReportJob] LLM timed out during upgrade, keeping status report`);
      const recentItems = await storage.getRecentItemsBySourceIds(sourceIds, lookbackHours, 20);
      content = buildStatusReport(profile.name, today, recentItems, sourceIds.length);
      reportStage = "status";
    }
  }

  const updated = await storage.updateOutputContent(outputId, {
    contentText: content,
    title: reportStage === "full" ? `${profile.name} - ${today}` : `${profile.name} — 상태 리포트`,
    reportStage,
  });

  if (!updated) {
    console.error(`[ReportJob] Failed to upgrade report ${outputId}`);
    return null;
  }

  if (items.length > 0) {
    try {
      await storage.linkOutputItems(outputId, items.map((i) => i.id));
    } catch (e) {
    }
  }

  console.log(`[ReportJob] Upgraded report ${outputId} to ${reportStage} (${items.length} items)`);

  return {
    profileId,
    reportId: outputId,
    itemsCount: items.length,
    topic: profile.topic,
  };
}
