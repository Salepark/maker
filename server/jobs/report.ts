import { storage } from "../storage";
import { callLLM, callLLMWithConfig, hasSystemLLMKey, type LLMConfig } from "../llm/client";
import { buildDailyBriefPrompt, ReportConfig } from "../llm/prompts";

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

// Check if current time matches the profile's scheduleCron
function shouldRunNow(scheduleCron: string, timezone: string): boolean {
  try {
    const now = new Date();
    
    // Get current time in the profile's timezone
    const options = { timeZone: timezone, hour12: false } as const;
    const formatter = new Intl.DateTimeFormat('en-US', {
      ...options,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value || 'Mon';
    
    // Map weekday string to number (0=Sun, 1=Mon, ..., 6=Sat)
    const weekdayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };
    const currentDow = weekdayMap[weekdayStr] ?? 1;

    // Parse cron: "minute hour dayOfMonth month dayOfWeek"
    const cronParts = scheduleCron.trim().split(/\s+/);
    if (cronParts.length < 5) return false;

    const [cronMinute, cronHour, , , cronDow] = cronParts;

    // Check minute (allow 0-1 minute tolerance for scheduler timing)
    const targetMinute = cronMinute === '*' ? currentMinute : parseInt(cronMinute);
    if (Math.abs(currentMinute - targetMinute) > 1) return false;

    // Check hour
    const targetHour = cronHour === '*' ? currentHour : parseInt(cronHour);
    if (currentHour !== targetHour) return false;

    // Check day of week
    if (cronDow !== '*') {
      // Handle formats like "1-5" (Mon-Fri) or "0,6" (Sat,Sun)
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

    return true;
  } catch (error) {
    console.error('[ReportJob] Error parsing scheduleCron:', error);
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
  const lookbackHours = 24;
  const maxItems = 12;

  for (const profile of activeProfiles) {
    try {
      // Check if profile should run now based on its scheduleCron
      if (!shouldRunNow(profile.scheduleCron, profile.timezone)) {
        continue; // Not time to run this profile yet
      }

      console.log(`[ReportJob] Processing profile: ${profile.name} (id=${profile.id}, topic=${profile.topic})`);

      const userBots = await storage.listBots(profile.userId);
      const matchingBot = userBots.find(b => b.key === profile.topic);
      if (matchingBot && !matchingBot.isEnabled) {
        console.log(`[ReportJob] Bot '${matchingBot.name}' is disabled, skipping profile ${profile.id}`);
        continue;
      }

      const sourceIds = await storage.getProfileSourceIds(profile.id);
      
      if (sourceIds.length === 0) {
        console.log(`[ReportJob] Profile ${profile.id} has no sources linked, skipping`);
        continue;
      }

      const periodStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
      const periodEnd = now;

      const exists = await storage.outputExists(profile.id, periodStart, periodEnd);
      if (exists) {
        console.log(`[ReportJob] Report already exists for profile ${profile.id} in this period, skipping`);
        continue;
      }

      let items = await storage.getItemsForReport(
        null,
        sourceIds,
        lookbackHours,
        maxItems
      );

      // Apply minImportanceScore filter from configJson
      const config = (profile.configJson || {}) as ReportConfig;
      const minScore = config.filters?.minImportanceScore ?? 0;
      if (minScore > 0) {
        items = items.filter(item => (item.importanceScore || 0) >= minScore);
      }

      console.log(`[ReportJob] Found ${items.length} items for profile ${profile.id} (after importance filter: minScore=${minScore})`);

      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        timeZone: profile.timezone || "Asia/Seoul",
      });

      if (items.length === 0) {
        console.log(`[ReportJob] No analyzed items for profile ${profile.id}, creating status report`);
        const recentItems = await storage.getRecentItemsBySourceIds(sourceIds, lookbackHours, 20);
        const statusContent = buildStatusReport(profile.name, today, recentItems, sourceIds.length);
        const report = await storage.createOutputRecord({
          userId: profile.userId,
          profileId: profile.id,
          presetId: profile.presetId,
          topic: profile.topic,
          outputType: "report",
          title: `${profile.name} — 상태 리포트`,
          contentText: statusContent,
          reportStage: "status",
          periodStart,
          periodEnd,
        });

        await storage.updateProfileLastRunAt(profile.id, now);

        results.push({
          profileId: profile.id,
          reportId: report.id,
          itemsCount: 0,
          topic: profile.topic,
        });
        continue;
      }

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
      
      console.log(`[ReportJob] Calling LLM for profile ${profile.id}...`);
      const content = await callLLMForProfile(prompt, profile.userId, profile.topic);

      const report = await storage.createOutputRecord({
        userId: profile.userId,
        profileId: profile.id,
        presetId: profile.presetId,
        topic: profile.topic,
        outputType: "report",
        title: `${profile.name} - ${today}`,
        contentText: content,
        periodStart,
        periodEnd,
      });

      await storage.linkOutputItems(report.id, items.map((i) => i.id));
      await storage.updateProfileLastRunAt(profile.id, now);

      console.log(`[ReportJob] Created report ${report.id} for profile ${profile.id} with ${items.length} items`);

      results.push({
        profileId: profile.id,
        reportId: report.id,
        itemsCount: items.length,
        topic: profile.topic,
      });

    } catch (error) {
      console.error(`[ReportJob] Failed to generate report for profile ${profile.id}:`, error);
    }
  }

  console.log(`[ReportJob] Completed. Generated ${results.length} reports`);
  return results;
}

export async function generateReportForProfile(profileId: number, userId?: string): Promise<ReportJobResult | null> {
  console.log(`[ReportJob] Manual generation for profile ${profileId}`);

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

  const now = new Date();
  const lookbackHours = 24;
  const maxItems = 12;
  const periodStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
  const periodEnd = now;

  let items = await storage.getItemsForReport(
    null,
    sourceIds,
    lookbackHours,
    maxItems
  );

  // Apply minImportanceScore filter from configJson
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
  let reportStage = "full";
  
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
    content = await callLLMForProfile(prompt, profile.userId, profile.topic);
  }

  const report = await storage.createOutputRecord({
    userId: profile.userId,
    profileId: profile.id,
    presetId: profile.presetId,
    topic: profile.topic,
    outputType: "report",
    title: `${profile.name} - ${today}`,
    contentText: content,
    reportStage,
    periodStart,
    periodEnd,
  });

  if (items.length > 0) {
    await storage.linkOutputItems(report.id, items.map((i) => i.id));
  }
  
  await storage.updateProfileLastRunAt(profile.id, now);

  console.log(`[ReportJob] Created ${reportStage} report ${report.id} for profile ${profile.id}`);

  return {
    profileId: profile.id,
    reportId: report.id,
    itemsCount: items.length,
    topic: profile.topic,
  };
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
    lines.push("분석이 완료되면 상세 리포트로 자동 업데이트됩니다.");
  }

  lines.push("");
  lines.push(`다음 수집 주기에서 업데이트 예정입니다.`);

  return lines.join("\n");
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
  lines.push("*상세 분석 리포트가 준비되면 자동으로 업데이트됩니다.*");

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
    content = await callLLMForProfile(prompt, profile.userId, profile.topic);
    reportStage = "full";
  }

  const updated = await storage.updateOutputContent(outputId, {
    contentText: content,
    title: `${profile.name} - ${today}`,
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
