import { storage } from "../storage";
import { callLLM } from "../llm/client";
import { buildDailyBriefPrompt, ReportConfig } from "../llm/prompts";

interface ReportJobResult {
  profileId: number;
  reportId: number;
  itemsCount: number;
  topic: string;
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
        profile.topic,
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

      if (items.length === 0) {
        console.log(`[ReportJob] No items found for profile ${profile.id}, creating empty report`);
        const report = await storage.createOutputRecord({
          userId: profile.userId,
          profileId: profile.id,
          presetId: profile.presetId,
          topic: profile.topic,
          outputType: "report",
          title: `${profile.name} - No Data`,
          contentText: `# ${profile.name}\n\n> 분석된 아이템이 없습니다.`,
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

      for (const item of items) {
        if (item.topic !== profile.topic) {
          console.error(`[ReportJob] TOPIC MISMATCH: item ${item.id} has topic ${item.topic} but profile expects ${profile.topic}`);
          throw new Error(`Topic mismatch detected: item.topic=${item.topic}, profile.topic=${profile.topic}`);
        }
      }

      const today = new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        timeZone: profile.timezone || "Asia/Seoul",
      });

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
      const content = await callLLM(prompt, 3, 4000);

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
    return null;
  }

  if (userId && profile.userId !== userId) {
    console.error(`[ReportJob] Profile ${profileId} does not belong to user ${userId}`);
    return null;
  }

  const sourceIds = await storage.getProfileSourceIds(profile.id);
  
  if (sourceIds.length === 0) {
    console.error(`[ReportJob] Profile ${profileId} has no sources linked`);
    return null;
  }

  const now = new Date();
  const lookbackHours = 24;
  const maxItems = 12;
  const periodStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
  const periodEnd = now;

  let items = await storage.getItemsForReport(
    profile.topic,
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

  for (const item of items) {
    if (item.topic !== profile.topic) {
      throw new Error(`Topic mismatch: item ${item.id} has topic ${item.topic} but profile expects ${profile.topic}`);
    }
  }

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: profile.timezone || "Asia/Seoul",
  });

  let content: string;
  
  if (items.length === 0) {
    content = `# ${profile.name}\n\n> 분석된 아이템이 없습니다.`;
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
    content = await callLLM(prompt, 3, 4000);
  }

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

  if (items.length > 0) {
    await storage.linkOutputItems(report.id, items.map((i) => i.id));
  }
  
  await storage.updateProfileLastRunAt(profile.id, now);

  console.log(`[ReportJob] Created report ${report.id} for profile ${profile.id}`);

  return {
    profileId: profile.id,
    reportId: report.id,
    itemsCount: items.length,
    topic: profile.topic,
  };
}
