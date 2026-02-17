import { db } from "./db";
import { encrypt, decrypt } from "./lib/crypto";
import { 
  sources, items, analysis, drafts, posts, reports, chatMessages, chatThreads, settings,
  presets, profiles, profileSources, outputs, outputItems,
  bots, botSettings, sourceBotLinks, llmProviders, jobRuns,
  permissions, auditLogs, reportMetrics, ruleMemories,
  telegramLinks, linkCodes, appSettings,
  type Source, type Item, type Analysis, type Draft, type Post, type Report, 
  type InsertSource, type InsertItem, type InsertAnalysis, type InsertDraft, type InsertReport, 
  type ChatMessage, type InsertChatMessage, type ChatThread, type InsertChatThread, type Setting,
  type Preset, type InsertPreset, type Profile, type InsertProfile, 
  type Output, type InsertOutput, type OutputItem,
  type Bot, type InsertBot, type BotSettings, type InsertBotSettings, type SourceBotLink,
  type LlmProvider, type InsertLlmProvider,
  type JobRun, type InsertJobRun,
  type Permission, type InsertPermission,
  type RuleMemory,
  type TelegramLink,
} from "@shared/schema";
import { eq, desc, sql, and, count, gte, lt, lte, or, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  getStats(userId?: string): Promise<{
    total: number;
    new: number;
    analyzed: number;
    drafted: number;
    approved: number;
    posted: number;
    skipped: number;
    lastCollectAt: string | null;
    lastAnalyzeAt: string | null;
  }>;

  getSources(): Promise<(Source & { itemCount: number })[]>;
  getSource(id: number): Promise<Source | undefined>;
  createSource(data: InsertSource): Promise<Source>;
  updateSource(id: number, data: Partial<InsertSource>): Promise<Source | undefined>;
  deleteSource(id: number): Promise<void>;

  getItems(status?: string, userId?: string): Promise<(Item & { sourceName: string; relevanceScore?: number; replyWorthinessScore?: number })[]>;
  getRecentItems(limit?: number, userId?: string): Promise<(Item & { sourceName: string })[]>;
  getObserveItems(limit?: number, userId?: string): Promise<any[]>;
  getItem(id: number, userId?: string): Promise<(Item & { sourceName: string; analysis?: Analysis; drafts: Draft[] }) | undefined>;
  getItemsByStatus(status: string, limit?: number): Promise<(Item & { sourceName: string; sourceTopic: string; rulesJson?: unknown })[]>;
  getItemsByStatusAndSourceIds(status: string, sourceIds: number[], limit?: number): Promise<(Item & { sourceName: string; sourceTopic: string; rulesJson?: unknown })[]>;
  createItem(data: InsertItem): Promise<Item>;
  findItemByDedupeKey(sourceId: number, url: string): Promise<Item | undefined>;
  updateItemStatus(id: number, status: string): Promise<void>;

  createAnalysis(data: InsertAnalysis): Promise<Analysis>;
  getAnalysisByItemId(itemId: number): Promise<Analysis | undefined>;

  getDrafts(decision?: string, userId?: string): Promise<(Draft & { itemTitle: string; itemUrl: string; sourceName: string })[]>;
  getDraftsByItemId(itemId: number): Promise<Draft[]>;
  createDraft(data: InsertDraft): Promise<Draft>;
  updateDraftDecision(id: number, decision: string, finalText?: string): Promise<void>;

  getReports(limit?: number): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  createReport(data: InsertReport): Promise<Report>;
  getAnalyzedItemsForBrief(lookbackHours: number, limit: number, topic?: string): Promise<any[]>;

  createThread(userId: string, title?: string): Promise<ChatThread>;
  getThread(threadId: number, userId: string): Promise<ChatThread | null>;
  getUserThreads(userId: string): Promise<ChatThread[]>;
  setThreadActiveBot(threadId: number, userId: string, botId: number | null): Promise<void>;
  getOrCreateDefaultThread(userId: string): Promise<ChatThread>;
  listThreadMessages(threadId: number, userId: string, limit?: number): Promise<ChatMessage[]>;
  addThreadMessage(data: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessageStatus(id: number, userId: string, status: string): Promise<void>;
  savePendingCommand(messageId: number, userId: string, commandJson: any): Promise<void>;
  clearPendingCommand(messageId: number, userId: string): Promise<void>;

  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;

  // Presets
  listPresets(): Promise<Preset[]>;
  getPresetById(id: number): Promise<Preset | undefined>;

  // Profiles
  listProfiles(userId: string): Promise<(Profile & { presetName: string })[]>;
  getProfile(id: number, userId: string): Promise<(Profile & { presetName: string }) | undefined>;
  getProfileById(id: number): Promise<Profile | undefined>;
  getProfileByUserAndTopic(userId: string, topic: string): Promise<Profile | undefined>;
  createProfile(data: InsertProfile): Promise<Profile>;
  updateProfile(id: number, userId: string, patch: Partial<InsertProfile>): Promise<Profile | undefined>;
  deleteProfile(id: number, userId: string): Promise<void>;
  cloneProfile(id: number, userId: string): Promise<Profile | undefined>;

  // Sources (updated for userId support)
  listSources(userId: string, topic?: string): Promise<Source[]>;
  listSourceTemplates(topic?: string): Promise<Source[]>;
  installSourceTemplates(userId: string, sourceIds: number[]): Promise<Source[]>;
  getUserSource(id: number, userId: string): Promise<Source | undefined>;
  createUserSource(userId: string, data: Omit<InsertSource, 'userId'>): Promise<Source>;
  updateUserSource(userId: string, sourceId: number, patch: Partial<InsertSource>): Promise<Source | undefined>;
  deleteUserSource(userId: string, sourceId: number): Promise<void>;

  // Profile-Sources
  getProfileSources(profileId: number, userId: string): Promise<Source[]>;
  getProfileSourcesWithWeight(profileId: number, userId: string): Promise<(Source & { weight: number; isEnabled: boolean })[]>;
  setProfileSources(profileId: number, userId: string, sourceData: Array<{ sourceId: number; weight?: number; isEnabled?: boolean }>): Promise<void>;
  updateProfileSourceWeight(profileId: number, userId: string, sourceId: number, weight: number): Promise<void>;

  // Report Job helpers
  getActiveReportProfiles(): Promise<(Profile & { presetOutputType: string })[]>;
  getProfileSourceIds(profileId: number): Promise<number[]>;
  getItemsForReport(topic: string | null, sourceIds: number[], lookbackHours: number, limit: number): Promise<(Item & { importanceScore: number; sourceName: string })[]>;
  listAnalyzedItemsForReport(params: {
    topic?: string | null;
    sourceIds: number[];
    periodStart: Date;
    periodEnd: Date;
    limit?: number;
  }): Promise<Array<{
    id: number;
    title: string | null;
    url: string;
    sourceName: string;
    publishedAt: Date | null;
    relevanceScore: number | null;
    replyWorthinessScore: number | null;
    summaryShort: string;
  }>>;
  
  // Outputs (new unified table) management
  createOutputRecord(data: InsertOutput): Promise<Output>;
  outputExists(profileId: number, periodStart: Date, periodEnd: Date): Promise<boolean>;
  linkOutputItems(outputId: number, itemIds: number[]): Promise<void>;
  listOutputs(params: { userId: string; profileId?: number; from?: Date; to?: Date }): Promise<Output[]>;
  getOutputById(params: { userId: string; outputId: number }): Promise<Output | null>;
  updateOutputContent(outputId: number, patch: { contentText: string; title: string; reportStage: string }): Promise<Output | null>;
  updateProfileLastRunAt(profileId: number, runAt: Date): Promise<void>;
  getRecentItemsBySourceIds(sourceIds: number[], lookbackHours: number, limit: number): Promise<{ id: number; title: string | null; url: string; status: string; sourceName: string; sourceTopic: string; publishedAt: Date | null }[]>;

  // ============================================
  // BOTS - Step 8-1 Bot Management
  // ============================================
  listBots(userId: string): Promise<(Bot & { settings: BotSettings | null })[]>;
  getBot(id: number, userId: string): Promise<(Bot & { settings: BotSettings | null }) | undefined>;
  getBotByKey(userId: string, key: string): Promise<Bot | undefined>;
  createBot(data: InsertBot): Promise<Bot>;
  updateBot(id: number, userId: string, patch: Partial<InsertBot>): Promise<Bot | undefined>;
  deleteBot(id: number, userId: string): Promise<void>;

  // Bot Settings
  getBotSettings(botId: number): Promise<BotSettings | undefined>;
  createBotSettings(data: InsertBotSettings): Promise<BotSettings>;
  updateBotSettings(botId: number, patch: Partial<Omit<InsertBotSettings, 'botId'>>): Promise<BotSettings | undefined>;
  upsertBotSettings(userId: string, botId: number, input: Partial<Omit<InsertBotSettings, 'botId'>>): Promise<BotSettings>;

  // Source-Bot Links
  getBotSources(botId: number): Promise<(Source & { weight: number; isEnabled: boolean })[]>;
  setBotSources(botId: number, userId: string, sourceData: Array<{ sourceId: number; weight?: number; isEnabled?: boolean }>): Promise<void>;
  addSourceToBot(botId: number, userId: string, sourceId: number, weight?: number): Promise<void>;
  removeSourceFromBot(botId: number, userId: string, sourceId: number): Promise<void>;

  // Default bot creation on first login
  ensureDefaultBots(userId: string): Promise<Bot[]>;

  // ============================================
  // LLM PROVIDERS - Phase 3 BYO LLM
  // ============================================
  createLlmProvider(data: InsertLlmProvider): Promise<LlmProvider>;
  listLlmProviders(userId: string): Promise<LlmProvider[]>;
  listAllLlmProviders?(): Promise<LlmProvider[]>;
  getLlmProvider(id: number, userId: string): Promise<LlmProvider | undefined>;
  updateLlmProvider(id: number, userId: string, patch: Partial<Omit<InsertLlmProvider, 'userId'>>): Promise<LlmProvider | undefined>;
  deleteLlmProvider(id: number, userId: string): Promise<void>;
  resolveLLMForBot(botId: number): Promise<{ providerType: string; apiKey: string; baseUrl: string | null; model: string | null } | null>;
  resolveLLMForProfile(userId: string, topic: string): Promise<{ providerType: string; apiKey: string; baseUrl: string | null; model: string | null } | null>;
  getBotByUserAndKey(userId: string, key: string): Promise<Bot | undefined>;
  findSourceByUrl(url: string): Promise<Source | undefined>;
  createBotFromPreset(params: {
    userId: string;
    key: string;
    name: string;
    settings: Partial<Omit<InsertBotSettings, 'botId'>>;
    sourceData: Array<{ name: string; url: string; type?: string; topic: string }>;
  }): Promise<Bot>;

  // Job Runs
  createJobRun(data: Omit<InsertJobRun, 'id'>): Promise<JobRun>;
  finishJobRun(id: number, patch: Partial<InsertJobRun>): Promise<JobRun | null>;
  listJobRunsForBot(userId: string, botId: number, limit?: number): Promise<JobRun[]>;
  getLastJobRunForBot(userId: string, botId: number): Promise<JobRun | null>;
  getLastJobRunByBotKey(userId: string, botKey: string): Promise<JobRun | null>;

  // Report Metrics
  createReportMetric(data: { reportId: number; profileId: number; itemCount: number; keywordSummary: Record<string, number>; sourceDistribution: Record<string, number> }): Promise<any>;
  getReportMetricsForProfile(profileId: number, limit?: number): Promise<any[]>;

  // Permissions
  listPermissions(userId: string, scope: string, scopeId: number | null): Promise<Permission[]>;
  upsertPermission(userId: string, scope: string, scopeId: number | null, permissionKey: string, valueJson: any): Promise<Permission>;
  deletePermission(userId: string, scope: string, scopeId: number | null, permissionKey: string): Promise<void>;
  listAllUserPermissions(userId: string): Promise<Permission[]>;

  // Audit Log
  createAuditLog(entry: { userId: string; botId?: number | null; threadId?: string | null; eventType: string; permissionKey?: string | null; payloadJson?: any }): Promise<void>;
  listAuditLogs(userId: string, filters?: { botId?: number; eventType?: string; permissionKey?: string; limit?: number; since?: Date }): Promise<any[]>;

  // Rule Memories
  listRuleMemories(userId: string, scope: string, scopeId: number | null): Promise<RuleMemory[]>;
  listAllUserRuleMemories(userId: string): Promise<RuleMemory[]>;
  upsertRuleMemory(userId: string, scope: string, scopeId: number | null, key: string, valueJson: any): Promise<RuleMemory>;
  deleteRuleMemory(userId: string, scope: string, scopeId: number | null, key: string): Promise<void>;
  getEffectiveRules(userId: string, botId: number | null): Promise<Record<string, any>>;

  getTelegramLinkByUserId(userId: string): Promise<TelegramLink | null>;
  getTelegramLinkByChatId(chatId: string): Promise<TelegramLink | null>;
  createTelegramLink(data: { userId: string; telegramChatId: string; telegramUsername?: string; threadId: number }): Promise<TelegramLink>;
  deleteTelegramLink(userId: string): Promise<void>;
  createLinkCode(userId: string, platform: string): Promise<string>;
  consumeLinkCode(code: string): Promise<{ userId: string; platform: string } | null>;

  getAppSetting(key: string): Promise<string | null>;
  setAppSetting(key: string, value: string): Promise<void>;
  deleteAppSetting(key: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getStats(userId?: string) {
    let statsQuery = db
      .select({
        status: items.status,
        count: count(),
      })
      .from(items);
    
    if (userId) {
      statsQuery = statsQuery.innerJoin(sources, eq(items.sourceId, sources.id)).where(eq(sources.userId, userId)) as any;
    }

    const result = await (statsQuery as any).groupBy(items.status);

    const stats: {
      total: number;
      new: number;
      analyzed: number;
      drafted: number;
      approved: number;
      posted: number;
      skipped: number;
      lastCollectAt: string | null;
      lastAnalyzeAt: string | null;
    } = {
      total: 0,
      new: 0,
      analyzed: 0,
      drafted: 0,
      approved: 0,
      posted: 0,
      skipped: 0,
      lastCollectAt: null,
      lastAnalyzeAt: null,
    };

    for (const row of result) {
      const c = Number(row.count);
      stats.total += c;
      if (row.status in stats) {
        (stats as any)[row.status] = c;
      }
    }

    let lastCollectQuery = db
      .select({ insertedAt: items.insertedAt })
      .from(items);
    if (userId) {
      lastCollectQuery = lastCollectQuery.innerJoin(sources, eq(items.sourceId, sources.id)).where(eq(sources.userId, userId)) as any;
    }
    const lastCollect = await (lastCollectQuery as any).orderBy(desc(items.insertedAt)).limit(1);
    
    if (lastCollect.length > 0 && lastCollect[0].insertedAt) {
      stats.lastCollectAt = lastCollect[0].insertedAt.toISOString();
    }

    const lastAnalyze = await db
      .select({ createdAt: analysis.createdAt })
      .from(analysis)
      .orderBy(desc(analysis.createdAt))
      .limit(1);
    
    if (lastAnalyze.length > 0 && lastAnalyze[0].createdAt) {
      stats.lastAnalyzeAt = lastAnalyze[0].createdAt.toISOString();
    }

    return stats;
  }

  async getSources(): Promise<(Source & { itemCount: number })[]> {
    const result = await db
      .select({
        source: sources,
        itemCount: sql<number>`COALESCE(COUNT(${items.id}), 0)`.as("item_count"),
      })
      .from(sources)
      .leftJoin(items, eq(items.sourceId, sources.id))
      .groupBy(sources.id)
      .orderBy(desc(sources.createdAt));

    return result.map((r) => ({
      ...r.source,
      itemCount: Number(r.itemCount),
    }));
  }

  async getSource(id: number): Promise<Source | undefined> {
    const [source] = await db.select().from(sources).where(eq(sources.id, id));
    return source;
  }

  async createSource(data: InsertSource): Promise<Source> {
    const [source] = await db.insert(sources).values(data).returning();
    return source;
  }

  async updateSource(id: number, data: Partial<InsertSource>): Promise<Source | undefined> {
    const [source] = await db.update(sources).set(data).where(eq(sources.id, id)).returning();
    return source;
  }

  async deleteSource(id: number): Promise<void> {
    await db.delete(sources).where(eq(sources.id, id));
  }

  async getItems(status?: string, userId?: string): Promise<(Item & { sourceName: string; relevanceScore?: number; replyWorthinessScore?: number })[]> {
    const conditions: any[] = [];
    if (status && status !== "all") {
      conditions.push(eq(items.status, status));
    }
    if (userId) {
      conditions.push(eq(sources.userId, userId));
    }

    let query = db
      .select({
        item: items,
        sourceName: sources.name,
        relevanceScore: analysis.relevanceScore,
        replyWorthinessScore: analysis.replyWorthinessScore,
      })
      .from(items)
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .leftJoin(analysis, eq(analysis.itemId, items.id))
      .orderBy(desc(items.insertedAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    return result.map((r) => ({
      ...r.item,
      sourceName: r.sourceName || "Unknown",
      relevanceScore: r.relevanceScore ?? undefined,
      replyWorthinessScore: r.replyWorthinessScore ?? undefined,
    }));
  }

  async getRecentItems(limit: number = 10, userId?: string): Promise<(Item & { sourceName: string })[]> {
    let query = db
      .select({
        item: items,
        sourceName: sources.name,
      })
      .from(items)
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .orderBy(desc(items.insertedAt))
      .limit(limit);

    if (userId) {
      query = query.where(eq(sources.userId, userId)) as any;
    }

    const result = await query;
    return result.map((r) => ({
      ...r.item,
      sourceName: r.sourceName || "Unknown",
    }));
  }

  async getObserveItems(limit: number = 50, userId?: string): Promise<any[]> {
    const conditions: any[] = [
      eq(items.status, "skipped"),
      gte(analysis.relevanceScore, 60),
      lt(analysis.replyWorthinessScore, 50),
    ];
    if (userId) {
      conditions.push(eq(sources.userId, userId));
    }

    const result = await db
      .select({
        item: items,
        sourceName: sources.name,
        relevanceScore: analysis.relevanceScore,
        replyWorthinessScore: analysis.replyWorthinessScore,
        category: analysis.category,
        summaryShort: analysis.summaryShort,
      })
      .from(items)
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .leftJoin(analysis, eq(items.id, analysis.itemId))
      .where(and(...conditions))
      .orderBy(desc(analysis.relevanceScore))
      .limit(limit);

    return result.map((r) => ({
      id: r.item.id,
      title: r.item.title,
      url: r.item.url,
      sourceName: r.sourceName || "Unknown",
      status: r.item.status,
      publishedAt: r.item.publishedAt,
      relevanceScore: r.relevanceScore || 0,
      replyWorthinessScore: r.replyWorthinessScore || 0,
      category: r.category || "other",
      summaryShort: r.summaryShort || "",
    }));
  }

  async getItem(id: number, userId?: string): Promise<(Item & { sourceName: string; analysis?: Analysis; drafts: Draft[] }) | undefined> {
    const conditions: any[] = [eq(items.id, id)];
    if (userId) {
      conditions.push(eq(sources.userId, userId));
    }

    const [itemResult] = await db
      .select({
        item: items,
        sourceName: sources.name,
      })
      .from(items)
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(and(...conditions));

    if (!itemResult) return undefined;

    const [analysisResult] = await db.select().from(analysis).where(eq(analysis.itemId, id));
    const draftsResult = await db.select().from(drafts).where(eq(drafts.itemId, id)).orderBy(drafts.variant);

    return {
      ...itemResult.item,
      sourceName: itemResult.sourceName || "Unknown",
      analysis: analysisResult,
      drafts: draftsResult,
    };
  }

  async getItemsByStatus(status: string, limit: number = 10): Promise<(Item & { sourceName: string; sourceTopic: string; rulesJson?: unknown })[]> {
    const result = await db
      .select({
        item: items,
        sourceName: sources.name,
        sourceTopic: sources.topic,
        rulesJson: sources.rulesJson,
      })
      .from(items)
      .leftJoin(sources, eq(items.sourceId, sources.id))
      .where(eq(items.status, status))
      .orderBy(desc(items.insertedAt))
      .limit(limit);

    return result.map((r) => ({
      ...r.item,
      sourceName: r.sourceName || "Unknown",
      sourceTopic: r.sourceTopic || "general",
      rulesJson: r.rulesJson,
    }));
  }

  async getItemsByStatusAndSourceIds(status: string, sourceIds: number[], limit: number = 50): Promise<(Item & { sourceName: string; sourceTopic: string; rulesJson?: unknown })[]> {
    if (sourceIds.length === 0) return [];
    const result = await db
      .select({
        item: items,
        sourceName: sources.name,
        sourceTopic: sources.topic,
        rulesJson: sources.rulesJson,
      })
      .from(items)
      .leftJoin(sources, eq(items.sourceId, sources.id))
      .where(and(
        eq(items.status, status),
        inArray(items.sourceId, sourceIds)
      ))
      .orderBy(desc(items.insertedAt))
      .limit(limit);

    return result.map((r) => ({
      ...r.item,
      sourceName: r.sourceName || "Unknown",
      sourceTopic: r.sourceTopic || "general",
      rulesJson: r.rulesJson,
    }));
  }

  async createItem(data: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(data).returning();
    return item;
  }

  async findItemByDedupeKey(sourceId: number, url: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items)
      .where(and(eq(items.sourceId, sourceId), eq(items.url, url)))
      .limit(1);
    return item;
  }

  async updateItemStatus(id: number, status: string): Promise<void> {
    await db.update(items).set({ status }).where(eq(items.id, id));
  }

  async createAnalysis(data: InsertAnalysis): Promise<Analysis> {
    const [result] = await db.insert(analysis).values(data).returning();
    return result;
  }

  async getAnalysisByItemId(itemId: number): Promise<Analysis | undefined> {
    const [result] = await db.select().from(analysis).where(eq(analysis.itemId, itemId));
    return result;
  }

  async getDrafts(decision?: string, userId?: string): Promise<(Draft & { itemTitle: string; itemUrl: string; sourceName: string })[]> {
    const conditions: any[] = [];
    if (decision && decision !== "all") {
      conditions.push(eq(drafts.adminDecision, decision));
    }
    if (userId) {
      conditions.push(eq(sources.userId, userId));
    }

    let query = db
      .select({
        draft: drafts,
        itemTitle: items.title,
        itemUrl: items.url,
        sourceName: sources.name,
      })
      .from(drafts)
      .innerJoin(items, eq(drafts.itemId, items.id))
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .orderBy(desc(drafts.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    return result.map((r) => ({
      ...r.draft,
      itemTitle: r.itemTitle || "Untitled",
      itemUrl: r.itemUrl,
      sourceName: r.sourceName || "Unknown",
    }));
  }

  async getDraftsByItemId(itemId: number): Promise<Draft[]> {
    return db.select().from(drafts).where(eq(drafts.itemId, itemId)).orderBy(drafts.variant);
  }

  async createDraft(data: InsertDraft): Promise<Draft> {
    const [draft] = await db.insert(drafts).values(data).returning();
    return draft;
  }

  async updateDraftDecision(id: number, decision: string, finalText?: string): Promise<void> {
    // Update the draft's decision
    await db.update(drafts).set({ adminDecision: decision, finalText }).where(eq(drafts.id, id));
    
    // Get the draft to find the associated item
    const [draft] = await db.select({ itemId: drafts.itemId }).from(drafts).where(eq(drafts.id, id));
    
    if (draft && decision === "approved") {
      // Update the item status to approved
      await db.update(items).set({ status: "approved" }).where(eq(items.id, draft.itemId));
    }
  }

  async getReports(limit: number = 20): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(limit);
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }

  async createReport(data: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(data).returning();
    return report;
  }

  async getAnalyzedItemsForBrief(lookbackHours: number, limit: number, topic?: string): Promise<any[]> {
    const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    
    const conditions = [gte(items.insertedAt, cutoff)];
    
    if (topic) {
      conditions.push(eq(sources.topic, topic));
    }
    
    const result = await db
      .select({
        item: items,
        sourceName: sources.name,
        sourceUrl: sources.url,
        sourceTopic: sources.topic,
        analysisData: analysis,
      })
      .from(items)
      .innerJoin(analysis, eq(items.id, analysis.itemId))
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(and(...conditions))
      .orderBy(desc(analysis.relevanceScore))
      .limit(limit);

    return result.map((r) => ({
      id: r.item.id,
      title: r.item.title,
      url: r.item.url,
      source: r.sourceName || "Unknown",
      topic: r.sourceTopic,
      key_takeaway: r.analysisData.summaryShort,
      why_it_matters: r.analysisData.suggestedAngle,
      impact_scope: {
        equities: r.analysisData.relevanceScore,
        rates_fx: Math.floor(r.analysisData.relevanceScore * 0.7),
        commodities: Math.floor(r.analysisData.relevanceScore * 0.5),
        crypto: Math.floor(r.analysisData.relevanceScore * 0.8),
      },
      risk_flags: r.analysisData.riskFlagsJson || [],
      confidence: r.analysisData.relevanceScore,
      category: r.analysisData.category,
    }));
  }

  async createThread(userId: string, title?: string): Promise<ChatThread> {
    const [thread] = await db.insert(chatThreads).values({
      userId,
      title: title || null,
    }).returning();
    return thread;
  }

  async getThread(threadId: number, userId: string): Promise<ChatThread | null> {
    const [thread] = await db.select().from(chatThreads)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));
    return thread || null;
  }

  async getUserThreads(userId: string): Promise<ChatThread[]> {
    return db.select().from(chatThreads)
      .where(eq(chatThreads.userId, userId))
      .orderBy(desc(chatThreads.createdAt));
  }

  async setThreadActiveBot(threadId: number, userId: string, botId: number | null): Promise<void> {
    await db.update(chatThreads)
      .set({ activeBotId: botId })
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));
  }

  async getOrCreateDefaultThread(userId: string): Promise<ChatThread> {
    const threads = await this.getUserThreads(userId);
    if (threads.length > 0) return threads[0];
    return this.createThread(userId, "Default Thread");
  }

  async listThreadMessages(threadId: number, userId: string, limit: number = 100): Promise<ChatMessage[]> {
    const thread = await this.getThread(threadId, userId);
    if (!thread) return [];
    return db.select().from(chatMessages)
      .where(and(eq(chatMessages.threadId, threadId), eq(chatMessages.userId, userId)))
      .orderBy(desc(chatMessages.createdAt)).limit(limit);
  }

  async addThreadMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  async updateChatMessageStatus(id: number, userId: string, status: string): Promise<void> {
    await db.update(chatMessages)
      .set({ status })
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)));
  }

  async savePendingCommand(messageId: number, userId: string, commandJson: any): Promise<void> {
    await db.update(chatMessages)
      .set({ commandJson, kind: "pending_command", status: "pending_confirm" })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)));
  }

  async clearPendingCommand(messageId: number, userId: string): Promise<void> {
    await db.update(chatMessages)
      .set({ status: "done" })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, userId)));
  }

  async getChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt)).limit(limit);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [row] = await db.select().from(settings).where(eq(settings.key, key));
    return row?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() }
    });
  }

  // ============================================
  // PRESETS
  // ============================================
  async listPresets(): Promise<Preset[]> {
    return db.select().from(presets).orderBy(presets.name);
  }

  async getPresetById(id: number): Promise<Preset | undefined> {
    const [preset] = await db.select().from(presets).where(eq(presets.id, id));
    return preset;
  }

  // ============================================
  // PROFILES
  // ============================================
  async listProfiles(userId: string): Promise<(Profile & { presetName: string })[]> {
    const result = await db
      .select({
        profile: profiles,
        presetName: presets.name,
      })
      .from(profiles)
      .leftJoin(presets, eq(profiles.presetId, presets.id))
      .where(eq(profiles.userId, userId))
      .orderBy(desc(profiles.createdAt));

    return result.map((r) => ({
      ...r.profile,
      presetName: r.presetName || "Unknown",
    }));
  }

  async getProfile(id: number, userId: string): Promise<(Profile & { presetName: string }) | undefined> {
    const [result] = await db
      .select({
        profile: profiles,
        presetName: presets.name,
      })
      .from(profiles)
      .leftJoin(presets, eq(profiles.presetId, presets.id))
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)));

    if (!result) return undefined;

    return {
      ...result.profile,
      presetName: result.presetName || "Unknown",
    };
  }

  async getProfileById(id: number): Promise<Profile | undefined> {
    const [result] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id));
    return result;
  }

  async getProfileByUserAndTopic(userId: string, topic: string): Promise<Profile | undefined> {
    const [result] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.topic, topic)))
      .orderBy(desc(profiles.createdAt))
      .limit(1);
    return result;
  }

  async createProfile(data: InsertProfile): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(data).returning();
    return profile;
  }

  async updateProfile(id: number, userId: string, patch: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [profile] = await db
      .update(profiles)
      .set(patch)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .returning();
    return profile;
  }

  async deleteProfile(id: number, userId: string): Promise<void> {
    await db.delete(profiles).where(and(eq(profiles.id, id), eq(profiles.userId, userId)));
  }

  async cloneProfile(id: number, userId: string): Promise<Profile | undefined> {
    const existing = await this.getProfile(id, userId);
    if (!existing) return undefined;

    const newProfile = await this.createProfile({
      userId: existing.userId,
      presetId: existing.presetId,
      name: `${existing.name} (Copy)`,
      topic: existing.topic,
      variantKey: existing.variantKey,
      timezone: existing.timezone,
      scheduleCron: existing.scheduleCron,
      configJson: existing.configJson as Record<string, unknown>,
      isActive: existing.isActive,
    });
    
    // Also clone profile sources with weights
    const existingSources = await this.getProfileSourcesWithWeight(id, userId);
    if (existingSources.length > 0) {
      await this.setProfileSources(
        newProfile.id, 
        userId, 
        existingSources.map(s => ({ sourceId: s.id, weight: s.weight, isEnabled: s.isEnabled }))
      );
    }

    return newProfile;
  }

  // ============================================
  // SOURCES (with userId support)
  // ============================================
  async listSources(userId: string, topic?: string): Promise<Source[]> {
    const conditions = [
      eq(sources.userId, userId)
    ];
    
    if (topic) {
      conditions.push(eq(sources.topic, topic));
    }

    return db
      .select()
      .from(sources)
      .where(and(...conditions))
      .orderBy(desc(sources.isDefault), sources.name);
  }

  async listSourceTemplates(topic?: string): Promise<Source[]> {
    const conditions = [
      eq(sources.isDefault, true),
      isNull(sources.userId),
    ];
    if (topic) {
      conditions.push(eq(sources.topic, topic));
    }
    return db
      .select()
      .from(sources)
      .where(and(...conditions))
      .orderBy(sources.topic, sources.name);
  }

  async installSourceTemplates(userId: string, sourceIds: number[]): Promise<Source[]> {
    const templates = await db
      .select()
      .from(sources)
      .where(and(eq(sources.isDefault, true), isNull(sources.userId), inArray(sources.id, sourceIds)));

    const installed: Source[] = [];
    for (const tmpl of templates) {
      const existing = await db
        .select()
        .from(sources)
        .where(and(eq(sources.userId, userId), eq(sources.url, tmpl.url)))
        .limit(1);
      if (existing.length > 0) {
        installed.push(existing[0]);
        continue;
      }
      const [newSource] = await db.insert(sources).values({
        name: tmpl.name,
        url: tmpl.url,
        type: tmpl.type,
        topic: tmpl.topic,
        trustLevel: tmpl.trustLevel,
        region: tmpl.region,
        userId,
        isDefault: false,
        enabled: true,
      }).returning();
      installed.push(newSource);
    }
    return installed;
  }

  async getUserSource(id: number, userId: string): Promise<Source | undefined> {
    const [source] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.id, id), eq(sources.userId, userId)));
    return source;
  }

  async createUserSource(userId: string, data: Omit<InsertSource, 'userId'>): Promise<Source> {
    const [source] = await db.insert(sources).values({ ...data, userId }).returning();
    return source;
  }

  async updateUserSource(userId: string, sourceId: number, patch: Partial<InsertSource>): Promise<Source | undefined> {
    const [source] = await db
      .update(sources)
      .set(patch)
      .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
      .returning();
    return source;
  }

  async deleteUserSource(userId: string, sourceId: number): Promise<void> {
    await db.delete(sources).where(and(eq(sources.id, sourceId), eq(sources.userId, userId)));
  }

  // ============================================
  // PROFILE-SOURCES
  // ============================================
  async getProfileSources(profileId: number, userId: string): Promise<Source[]> {
    const profile = await this.getProfile(profileId, userId);
    if (!profile) return [];

    const result = await db
      .select({ source: sources })
      .from(profileSources)
      .innerJoin(sources, eq(profileSources.sourceId, sources.id))
      .where(eq(profileSources.profileId, profileId));

    return result.map(r => r.source);
  }

  async getProfileSourcesWithWeight(profileId: number, userId: string): Promise<(Source & { weight: number; isEnabled: boolean })[]> {
    const profile = await this.getProfile(profileId, userId);
    if (!profile) return [];

    const result = await db
      .select({ 
        source: sources, 
        weight: profileSources.weight,
        isEnabled: profileSources.isEnabled
      })
      .from(profileSources)
      .innerJoin(sources, eq(profileSources.sourceId, sources.id))
      .where(eq(profileSources.profileId, profileId))
      .orderBy(desc(profileSources.weight));

    return result.map(r => ({ ...r.source, weight: r.weight, isEnabled: r.isEnabled }));
  }

  async setProfileSources(
    profileId: number, 
    userId: string, 
    sourceData: Array<{ sourceId: number; weight?: number; isEnabled?: boolean }>
  ): Promise<void> {
    const profile = await this.getProfile(profileId, userId);
    if (!profile) return;

    await db.delete(profileSources).where(eq(profileSources.profileId, profileId));

    if (sourceData.length > 0) {
      const sourceIds = sourceData.map(s => s.sourceId);
      
      const validSources = await db
        .select({ id: sources.id })
        .from(sources)
        .where(and(
          inArray(sources.id, sourceIds),
          eq(sources.topic, profile.topic)
        ));

      const validSourceIds = new Set(validSources.map(s => s.id));

      if (validSourceIds.size !== sourceIds.length) {
        console.warn(`[setProfileSources] Topic mismatch: ${sourceIds.length - validSourceIds.size} sources filtered out for profile ${profileId} (topic: ${profile.topic})`);
      }

      const validData = sourceData.filter(s => validSourceIds.has(s.sourceId));

      if (validData.length > 0) {
        await db.insert(profileSources).values(
          validData.map(s => ({ 
            profileId, 
            sourceId: s.sourceId,
            weight: s.weight ?? 3,
            isEnabled: s.isEnabled ?? true
          }))
        );
      }
    }
  }
  
  async updateProfileSourceWeight(profileId: number, userId: string, sourceId: number, weight: number): Promise<void> {
    const profile = await this.getProfile(profileId, userId);
    if (!profile) return;
    
    await db.update(profileSources)
      .set({ weight: Math.min(5, Math.max(1, weight)) })
      .where(and(
        eq(profileSources.profileId, profileId),
        eq(profileSources.sourceId, sourceId)
      ));
  }

  // ============================================
  // REPORT JOB HELPERS
  // ============================================
  async getActiveReportProfiles(): Promise<(Profile & { presetOutputType: string })[]> {
    const result = await db
      .select({
        profile: profiles,
        presetOutputType: presets.outputType,
      })
      .from(profiles)
      .innerJoin(presets, eq(profiles.presetId, presets.id))
      .where(and(
        eq(profiles.isActive, true),
        eq(presets.outputType, "report")
      ));

    return result.map((r) => ({
      ...r.profile,
      presetOutputType: r.presetOutputType,
    }));
  }

  async getProfileSourceIds(profileId: number): Promise<number[]> {
    const result = await db
      .select({ sourceId: profileSources.sourceId })
      .from(profileSources)
      .where(eq(profileSources.profileId, profileId));

    return result.map((r) => r.sourceId);
  }

  async getItemsForReport(
    topic: string | null,
    sourceIds: number[],
    lookbackHours: number,
    limit: number
  ): Promise<(Item & { importanceScore: number; sourceName: string })[]> {
    if (sourceIds.length === 0) return [];

    const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const conditions = [
      inArray(items.status, ["analyzed", "drafted", "approved"]),
      inArray(items.sourceId, sourceIds),
      gte(items.publishedAt, cutoff),
    ];
    if (topic) {
      conditions.push(eq(items.topic, topic));
    }

    const result = await db
      .select({
        item: items,
        importanceScore: analysis.importanceScore,
        sourceName: sources.name,
      })
      .from(items)
      .innerJoin(analysis, eq(items.id, analysis.itemId))
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(and(...conditions))
      .orderBy(desc(analysis.importanceScore))
      .limit(limit);

    return result.map((r) => ({
      ...r.item,
      importanceScore: r.importanceScore,
      sourceName: r.sourceName,
    }));
  }

  async listAnalyzedItemsForReport(params: {
    topic: string;
    sourceIds: number[];
    periodStart: Date;
    periodEnd: Date;
    limit?: number;
  }): Promise<Array<{
    id: number;
    title: string | null;
    url: string;
    sourceName: string;
    publishedAt: Date | null;
    relevanceScore: number | null;
    replyWorthinessScore: number | null;
    summaryShort: string;
  }>> {
    if (!params.sourceIds.length) return [];

    const limit = params.limit ?? 50;

    const rows = await db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        sourceName: sources.name,
        publishedAt: items.publishedAt,
        relevanceScore: analysis.relevanceScore,
        replyWorthinessScore: analysis.replyWorthinessScore,
        summaryShort: analysis.summaryShort,
      })
      .from(items)
      .innerJoin(analysis, eq(analysis.itemId, items.id))
      .innerJoin(sources, eq(sources.id, items.sourceId))
      .where(
        and(
          ...(params.topic ? [eq(items.topic, params.topic)] : []),
          inArray(items.sourceId, params.sourceIds),
          eq(items.status, "analyzed"),
          gte(items.publishedAt, params.periodStart),
          lte(items.publishedAt, params.periodEnd)
        )
      )
      .orderBy(desc(analysis.relevanceScore))
      .limit(limit);

    return rows;
  }

  // ============================================
  // OUTPUTS (NEW UNIFIED TABLE) MANAGEMENT
  // ============================================
  
  async outputExists(profileId: number, periodStart: Date, periodEnd: Date): Promise<boolean> {
    const windowStart = new Date(periodEnd.getTime() - 23 * 60 * 60 * 1000);
    const rows = await db
      .select({ id: outputs.id })
      .from(outputs)
      .where(and(
        eq(outputs.profileId, profileId),
        gte(outputs.createdAt, windowStart),
      ))
      .limit(1);

    return rows.length > 0;
  }

  async createOutputRecord(data: InsertOutput): Promise<Output> {
    const [output] = await db.insert(outputs).values(data).returning();
    return output;
  }

  async linkOutputItems(outputId: number, itemIds: number[]): Promise<void> {
    if (itemIds.length === 0) return;

    await db.insert(outputItems).values(
      itemIds.map((itemId) => ({
        outputId,
        itemId,
      }))
    );
  }

  async listOutputs(params: { userId: string; profileId?: number; from?: Date; to?: Date }): Promise<Output[]> {
    const conditions = [
      eq(outputs.userId, params.userId),
      eq(outputs.outputType, "report")
    ];

    if (params.profileId) {
      conditions.push(eq(outputs.profileId, params.profileId));
    }
    if (params.from) {
      conditions.push(gte(outputs.createdAt, params.from));
    }
    if (params.to) {
      conditions.push(lte(outputs.createdAt, params.to));
    }

    return db
      .select()
      .from(outputs)
      .where(and(...conditions))
      .orderBy(desc(outputs.createdAt))
      .limit(50);
  }

  async getOutputById(params: { userId: string; outputId: number }): Promise<Output | null> {
    const rows = await db
      .select()
      .from(outputs)
      .where(and(
        eq(outputs.id, params.outputId),
        eq(outputs.userId, params.userId),
        eq(outputs.outputType, "report")
      ))
      .limit(1);

    return rows[0] ?? null;
  }

  async updateOutputContent(outputId: number, patch: { contentText: string; title: string; reportStage: string }): Promise<Output | null> {
    const [updated] = await db
      .update(outputs)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(outputs.id, outputId))
      .returning();
    return updated ?? null;
  }

  async getRecentItemsBySourceIds(sourceIds: number[], lookbackHours: number, limit: number): Promise<{ id: number; title: string | null; url: string; status: string; sourceName: string; sourceTopic: string; publishedAt: Date | null }[]> {
    if (sourceIds.length === 0) return [];
    const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    const result = await db
      .select({
        id: items.id,
        title: items.title,
        url: items.url,
        status: items.status,
        sourceName: sources.name,
        sourceTopic: sources.topic,
        publishedAt: items.publishedAt,
      })
      .from(items)
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(and(
        inArray(items.sourceId, sourceIds),
        gte(items.publishedAt, cutoff),
      ))
      .orderBy(desc(items.publishedAt))
      .limit(limit);
    return result;
  }

  async updateProfileLastRunAt(profileId: number, runAt: Date): Promise<void> {
    await db
      .update(profiles)
      .set({ lastRunAt: runAt })
      .where(eq(profiles.id, profileId));
  }

  // ============================================
  // BOTS - Step 8-1 Bot Management
  // ============================================

  async listBots(userId: string): Promise<(Bot & { settings: BotSettings | null })[]> {
    const botsData = await db
      .select()
      .from(bots)
      .where(eq(bots.userId, userId))
      .orderBy(desc(bots.createdAt));

    const result: (Bot & { settings: BotSettings | null })[] = [];
    for (const bot of botsData) {
      const [settings] = await db
        .select()
        .from(botSettings)
        .where(eq(botSettings.botId, bot.id))
        .limit(1);
      result.push({ ...bot, settings: settings ?? null });
    }
    return result;
  }

  async getBot(id: number, userId: string): Promise<(Bot & { settings: BotSettings | null }) | undefined> {
    const [bot] = await db
      .select()
      .from(bots)
      .where(and(eq(bots.id, id), eq(bots.userId, userId)))
      .limit(1);

    if (!bot) return undefined;

    const [settings] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.botId, bot.id))
      .limit(1);

    return { ...bot, settings: settings ?? null };
  }

  async getBotByKey(userId: string, key: string): Promise<Bot | undefined> {
    const [bot] = await db
      .select()
      .from(bots)
      .where(and(eq(bots.userId, userId), eq(bots.key, key)))
      .limit(1);
    return bot;
  }

  async createBot(data: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(bots).values(data).returning();
    return bot;
  }

  async updateBot(id: number, userId: string, patch: Partial<InsertBot>): Promise<Bot | undefined> {
    const [updated] = await db
      .update(bots)
      .set(patch)
      .where(and(eq(bots.id, id), eq(bots.userId, userId)))
      .returning();
    return updated;
  }

  async deleteBot(id: number, userId: string): Promise<void> {
    await db.delete(bots).where(and(eq(bots.id, id), eq(bots.userId, userId)));
  }

  // Bot Settings
  async getBotSettings(botId: number): Promise<BotSettings | undefined> {
    const [settings] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.botId, botId))
      .limit(1);
    return settings;
  }

  async createBotSettings(data: InsertBotSettings): Promise<BotSettings> {
    const [settings] = await db.insert(botSettings).values(data).returning();
    return settings;
  }

  async updateBotSettings(botId: number, patch: Partial<Omit<InsertBotSettings, 'botId'>>): Promise<BotSettings | undefined> {
    const [updated] = await db
      .update(botSettings)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(botSettings.botId, botId))
      .returning();
    return updated;
  }

  async upsertBotSettings(userId: string, botId: number, input: Partial<Omit<InsertBotSettings, 'botId'>>): Promise<BotSettings> {
    const bot = await this.getBot(botId, userId);
    if (!bot) throw new Error("Bot not found or access denied");

    const existing = await this.getBotSettings(botId);
    if (existing) {
      const updated = await this.updateBotSettings(botId, input);
      return updated!;
    } else {
      return this.createBotSettings({ botId, ...input } as InsertBotSettings);
    }
  }

  // Source-Bot Links
  async getBotSources(botId: number): Promise<(Source & { weight: number; isEnabled: boolean })[]> {
    const links = await db
      .select({
        source: sources,
        weight: sourceBotLinks.weight,
        isEnabled: sourceBotLinks.isEnabled,
      })
      .from(sourceBotLinks)
      .innerJoin(sources, eq(sourceBotLinks.sourceId, sources.id))
      .where(eq(sourceBotLinks.botId, botId));

    return links.map(({ source, weight, isEnabled }) => ({
      ...source,
      weight,
      isEnabled,
    }));
  }

  async setBotSources(botId: number, userId: string, sourceData: Array<{ sourceId: number; weight?: number; isEnabled?: boolean }>): Promise<void> {
    // Verify bot belongs to user
    const [bot] = await db.select().from(bots).where(and(eq(bots.id, botId), eq(bots.userId, userId))).limit(1);
    if (!bot) throw new Error("Bot not found or access denied");

    // Validate source ownership: only user's own sources or default sources
    if (sourceData.length > 0) {
      const sourceIds = sourceData.map(s => s.sourceId);
      const validSources = await db.select({ id: sources.id })
        .from(sources)
        .where(and(
          inArray(sources.id, sourceIds),
          or(eq(sources.userId, userId), isNull(sources.userId))
        ));
      const validIds = new Set(validSources.map(s => s.id));
      const invalid = sourceIds.filter(id => !validIds.has(id));
      if (invalid.length > 0) {
        throw new Error(`Source IDs not accessible: ${invalid.join(', ')}`);
      }
    }

    // Delete existing links
    await db.delete(sourceBotLinks).where(eq(sourceBotLinks.botId, botId));

    // Insert new links
    if (sourceData.length > 0) {
      await db.insert(sourceBotLinks).values(
        sourceData.map(({ sourceId, weight = 3, isEnabled = true }) => ({
          botId,
          sourceId,
          weight,
          isEnabled,
        }))
      );
    }
  }

  async addSourceToBot(botId: number, userId: string, sourceId: number, weight: number = 3): Promise<void> {
    const [bot] = await db.select().from(bots).where(and(eq(bots.id, botId), eq(bots.userId, userId))).limit(1);
    if (!bot) throw new Error("Bot not found or access denied");

    const [source] = await db.select().from(sources).where(and(
      eq(sources.id, sourceId),
      or(eq(sources.userId, userId), isNull(sources.userId))
    )).limit(1);
    if (!source) throw new Error("Source not found or access denied");

    const [existing] = await db.select().from(sourceBotLinks)
      .where(and(eq(sourceBotLinks.botId, botId), eq(sourceBotLinks.sourceId, sourceId))).limit(1);
    if (existing) return;

    await db.insert(sourceBotLinks).values({ botId, sourceId, weight, isEnabled: true });
  }

  async removeSourceFromBot(botId: number, userId: string, sourceId: number): Promise<void> {
    const [bot] = await db.select().from(bots).where(and(eq(bots.id, botId), eq(bots.userId, userId))).limit(1);
    if (!bot) throw new Error("Bot not found or access denied");

    await db.delete(sourceBotLinks).where(and(
      eq(sourceBotLinks.botId, botId),
      eq(sourceBotLinks.sourceId, sourceId)
    ));
  }

  // Default bot creation on first login
  async ensureDefaultBots(userId: string): Promise<Bot[]> {
    const existingBots = await db.select().from(bots).where(eq(bots.userId, userId));
    if (existingBots.length > 0) {
      return existingBots;
    }

    const defaultBots = [
      { key: "ai_art", name: "AI Art Monitor" },
      { key: "investing", name: "Investing Brief" },
    ];

    const createdBots: Bot[] = [];
    for (const botDef of defaultBots) {
      const [bot] = await db.insert(bots).values({
        userId,
        key: botDef.key,
        name: botDef.name,
        isEnabled: true,
      }).returning();

      await db.insert(botSettings).values({
        botId: bot.id,
        timezone: "Asia/Seoul",
        scheduleRule: "DAILY",
        scheduleTimeLocal: "07:00",
        format: "clean",
        markdownLevel: "minimal",
        verbosity: "normal",
        sectionsJson: { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
        filtersJson: { minImportanceScore: 0, maxRiskLevel: 100 },
      });

      const templateSources = await db
        .select()
        .from(sources)
        .where(and(eq(sources.isDefault, true), isNull(sources.userId), eq(sources.topic, botDef.key)));

      if (templateSources.length > 0) {
        const userSources = await this.installSourceTemplates(userId, templateSources.map(s => s.id));
        if (userSources.length > 0) {
          await db.insert(sourceBotLinks).values(
            userSources.map(s => ({
              botId: bot.id,
              sourceId: s.id,
              weight: 3,
              isEnabled: true,
            }))
          );
        }
      }

      const matchingPreset = await db.select().from(presets).where(eq(presets.key, botDef.key === "investing" ? "daily_market_brief" : botDef.key === "ai_art" ? "news_briefing" : botDef.key)).limit(1);
      const presetId = matchingPreset[0]?.id ?? null;

      await db.insert(profiles).values({
        userId,
        presetId,
        name: botDef.name,
        topic: botDef.key,
        timezone: "Asia/Seoul",
        scheduleCron: "0 7 * * *",
        configJson: {
          sections: { tldr: true, drivers: true, risk: true, checklist: true, sources: true },
          filters: { minImportanceScore: 0, maxRiskLevel: 100 },
          verbosity: "normal",
          markdownLevel: "minimal",
        },
        isActive: true,
      });

      createdBots.push(bot);
    }

    return createdBots;
  }

  // ============================================
  // LLM PROVIDERS - Phase 3 BYO LLM
  // ============================================

  async createLlmProvider(data: InsertLlmProvider): Promise<LlmProvider> {
    const [provider] = await db.insert(llmProviders).values(data).returning();
    return provider;
  }

  async listLlmProviders(userId: string): Promise<LlmProvider[]> {
    return db.select().from(llmProviders).where(eq(llmProviders.userId, userId)).orderBy(desc(llmProviders.createdAt));
  }

  async listAllLlmProviders(): Promise<LlmProvider[]> {
    return db.select().from(llmProviders).orderBy(desc(llmProviders.createdAt));
  }

  async getLlmProvider(id: number, userId: string): Promise<LlmProvider | undefined> {
    const [provider] = await db.select().from(llmProviders).where(and(eq(llmProviders.id, id), eq(llmProviders.userId, userId)));
    return provider;
  }

  async updateLlmProvider(id: number, userId: string, patch: Partial<Omit<InsertLlmProvider, 'userId'>>): Promise<LlmProvider | undefined> {
    const [updated] = await db.update(llmProviders)
      .set(patch)
      .where(and(eq(llmProviders.id, id), eq(llmProviders.userId, userId)))
      .returning();
    return updated;
  }

  async deleteLlmProvider(id: number, userId: string): Promise<void> {
    await db.delete(llmProviders).where(and(eq(llmProviders.id, id), eq(llmProviders.userId, userId)));
  }

  async resolveLLMForBot(botId: number): Promise<{ providerType: string; apiKey: string; baseUrl: string | null; model: string | null } | null> {
    const [setting] = await db.select().from(botSettings).where(eq(botSettings.botId, botId));

    if (setting?.llmProviderId) {
      const [provider] = await db.select().from(llmProviders).where(eq(llmProviders.id, setting.llmProviderId));
      if (provider) {
        return {
          providerType: provider.providerType,
          apiKey: decrypt(provider.apiKeyEncrypted),
          baseUrl: provider.baseUrl,
          model: setting.modelOverride || provider.defaultModel,
        };
      }
    }

    const [bot] = await db.select().from(bots).where(eq(bots.id, botId));
    if (bot?.userId) {
      const userProviders = await db.select().from(llmProviders).where(eq(llmProviders.userId, bot.userId)).limit(1);
      if (userProviders.length > 0) {
        const provider = userProviders[0];
        return {
          providerType: provider.providerType,
          apiKey: decrypt(provider.apiKeyEncrypted),
          baseUrl: provider.baseUrl,
          model: provider.defaultModel,
        };
      }
    }

    return null;
  }

  async findSourceByUrl(url: string): Promise<Source | undefined> {
    const [source] = await db.select().from(sources).where(eq(sources.url, url));
    return source;
  }

  async createBotFromPreset(params: {
    userId: string;
    key: string;
    name: string;
    settings: Partial<Omit<InsertBotSettings, 'botId'>>;
    sourceData: Array<{ name: string; url: string; type?: string; topic: string }>;
  }): Promise<Bot> {
    return await db.transaction(async (tx) => {
      const [bot] = await tx.insert(bots).values({
        userId: params.userId,
        key: params.key,
        name: params.name,
        isEnabled: true,
      }).returning();

      await tx.insert(botSettings).values({
        botId: bot.id,
        ...params.settings,
      } as InsertBotSettings);

      if (params.sourceData.length > 0) {
        const sourceLinks: Array<{ botId: number; sourceId: number; weight: number; isEnabled: boolean }> = [];
        for (const sd of params.sourceData) {
          const [existing] = await tx.select().from(sources).where(eq(sources.url, sd.url)).limit(1);
          let sourceId: number;
          if (existing) {
            sourceId = existing.id;
          } else {
            const [created] = await tx.insert(sources).values({
              userId: null,
              name: sd.name,
              type: sd.type || "rss",
              url: sd.url,
              topic: sd.topic,
              isDefault: false,
              enabled: true,
            }).returning();
            sourceId = created.id;
          }
          sourceLinks.push({ botId: bot.id, sourceId, weight: 3, isEnabled: true });
        }
        if (sourceLinks.length > 0) {
          await tx.insert(sourceBotLinks).values(sourceLinks);
        }
      }

      return bot;
    });
  }

  async getBotByUserAndKey(userId: string, key: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots)
      .where(and(eq(bots.userId, userId), eq(bots.key, key)));
    return bot;
  }

  async resolveLLMForProfile(userId: string, topic: string): Promise<{ providerType: string; apiKey: string; baseUrl: string | null; model: string | null } | null> {
    const bot = await this.getBotByUserAndKey(userId, topic);
    if (!bot) return null;
    return this.resolveLLMForBot(bot.id);
  }

  async createJobRun(data: Omit<InsertJobRun, 'id'>): Promise<JobRun> {
    const [run] = await db.insert(jobRuns).values(data as any).returning();
    return run;
  }

  async finishJobRun(id: number, patch: Partial<InsertJobRun>): Promise<JobRun | null> {
    const [run] = await db.update(jobRuns).set(patch as any).where(eq(jobRuns.id, id)).returning();
    return run || null;
  }

  async listJobRunsForBot(userId: string, botId: number, limit: number = 20): Promise<JobRun[]> {
    return db.select().from(jobRuns)
      .where(and(eq(jobRuns.userId, userId), eq(jobRuns.botId, botId)))
      .orderBy(desc(jobRuns.startedAt))
      .limit(limit);
  }

  async getLastJobRunForBot(userId: string, botId: number): Promise<JobRun | null> {
    const [run] = await db.select().from(jobRuns)
      .where(and(eq(jobRuns.userId, userId), eq(jobRuns.botId, botId)))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1);
    return run || null;
  }

  async getLastJobRunByBotKey(userId: string, botKey: string): Promise<JobRun | null> {
    const [run] = await db.select().from(jobRuns)
      .where(and(eq(jobRuns.userId, userId), eq(jobRuns.botKey, botKey)))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1);
    return run || null;
  }

  async createReportMetric(data: { reportId: number; profileId: number; itemCount: number; keywordSummary: Record<string, number>; sourceDistribution: Record<string, number> }): Promise<any> {
    const [metric] = await db.insert(reportMetrics).values(data as any).returning();
    return metric;
  }

  async getReportMetricsForProfile(profileId: number, limit: number = 7): Promise<any[]> {
    return db.select().from(reportMetrics)
      .where(eq(reportMetrics.profileId, profileId))
      .orderBy(desc(reportMetrics.createdAt))
      .limit(limit);
  }

  async listPermissions(userId: string, scope: string, scopeId: number | null): Promise<Permission[]> {
    const conditions = [eq(permissions.userId, userId), eq(permissions.scope, scope)];
    if (scopeId != null) {
      conditions.push(eq(permissions.scopeId, scopeId));
    } else {
      conditions.push(isNull(permissions.scopeId));
    }
    return db.select().from(permissions).where(and(...conditions));
  }

  async upsertPermission(userId: string, scope: string, scopeId: number | null, permissionKey: string, valueJson: any): Promise<Permission> {
    const existing = await db.select().from(permissions)
      .where(and(
        eq(permissions.userId, userId),
        eq(permissions.scope, scope),
        scopeId != null ? eq(permissions.scopeId, scopeId) : isNull(permissions.scopeId),
        eq(permissions.permissionKey, permissionKey),
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(permissions)
        .set({ valueJson, updatedAt: new Date() } as any)
        .where(eq(permissions.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(permissions)
      .values({ userId, scope, scopeId, permissionKey, valueJson, updatedAt: new Date() } as any)
      .returning();
    return created;
  }

  async deletePermission(userId: string, scope: string, scopeId: number | null, permissionKey: string): Promise<void> {
    await db.delete(permissions).where(and(
      eq(permissions.userId, userId),
      eq(permissions.scope, scope),
      scopeId != null ? eq(permissions.scopeId, scopeId) : isNull(permissions.scopeId),
      eq(permissions.permissionKey, permissionKey),
    ));
  }

  async listAllUserPermissions(userId: string): Promise<Permission[]> {
    return db.select().from(permissions)
      .where(eq(permissions.userId, userId))
      .orderBy(permissions.scope, permissions.permissionKey);
  }

  async createAuditLog(entry: { userId: string; botId?: number | null; threadId?: string | null; eventType: string; permissionKey?: string | null; payloadJson?: any }): Promise<void> {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      botId: entry.botId ?? null,
      threadId: entry.threadId ?? null,
      eventType: entry.eventType,
      permissionKey: entry.permissionKey ?? null,
      payloadJson: entry.payloadJson ?? null,
    } as any);
  }

  async listAuditLogs(userId: string, filters?: { botId?: number; eventType?: string; permissionKey?: string; limit?: number; since?: Date }): Promise<any[]> {
    const conditions = [eq(auditLogs.userId, userId)];
    if (filters?.botId) conditions.push(eq(auditLogs.botId, filters.botId));
    if (filters?.eventType) conditions.push(eq(auditLogs.eventType, filters.eventType));
    if (filters?.permissionKey) conditions.push(eq(auditLogs.permissionKey, filters.permissionKey));
    if (filters?.since) conditions.push(gte(auditLogs.createdAt, filters.since));
    return db.select().from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters?.limit ?? 50);
  }

  async listRuleMemories(userId: string, scope: string, scopeId: number | null): Promise<RuleMemory[]> {
    const conditions = [eq(ruleMemories.userId, userId), eq(ruleMemories.scope, scope)];
    if (scopeId != null) {
      conditions.push(eq(ruleMemories.scopeId, scopeId));
    } else {
      conditions.push(isNull(ruleMemories.scopeId));
    }
    return db.select().from(ruleMemories).where(and(...conditions)).orderBy(ruleMemories.key);
  }

  async listAllUserRuleMemories(userId: string): Promise<RuleMemory[]> {
    return db.select().from(ruleMemories)
      .where(eq(ruleMemories.userId, userId))
      .orderBy(ruleMemories.scope, ruleMemories.key);
  }

  async upsertRuleMemory(userId: string, scope: string, scopeId: number | null, key: string, valueJson: any): Promise<RuleMemory> {
    const existing = await db.select().from(ruleMemories)
      .where(and(
        eq(ruleMemories.userId, userId),
        eq(ruleMemories.scope, scope),
        scopeId != null ? eq(ruleMemories.scopeId, scopeId) : isNull(ruleMemories.scopeId),
        eq(ruleMemories.key, key),
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(ruleMemories)
        .set({ valueJson, updatedAt: new Date() } as any)
        .where(eq(ruleMemories.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(ruleMemories)
      .values({ userId, scope, scopeId, key, valueJson, updatedAt: new Date() } as any)
      .returning();
    return created;
  }

  async deleteRuleMemory(userId: string, scope: string, scopeId: number | null, key: string): Promise<void> {
    await db.delete(ruleMemories).where(and(
      eq(ruleMemories.userId, userId),
      eq(ruleMemories.scope, scope),
      scopeId != null ? eq(ruleMemories.scopeId, scopeId) : isNull(ruleMemories.scopeId),
      eq(ruleMemories.key, key),
    ));
  }

  async getEffectiveRules(userId: string, botId: number | null): Promise<Record<string, any>> {
    const globalRules = await this.listRuleMemories(userId, "global", null);
    const botRules = botId ? await this.listRuleMemories(userId, "bot", botId) : [];

    const merged: Record<string, any> = {};
    for (const rule of globalRules) {
      merged[rule.key] = rule.valueJson;
    }
    for (const rule of botRules) {
      merged[rule.key] = rule.valueJson;
    }
    return merged;
  }

  async getTelegramLinkByUserId(userId: string): Promise<TelegramLink | null> {
    const [link] = await db.select().from(telegramLinks)
      .where(and(eq(telegramLinks.userId, userId), eq(telegramLinks.isActive, true)))
      .limit(1);
    return link || null;
  }

  async getTelegramLinkByChatId(chatId: string): Promise<TelegramLink | null> {
    const [link] = await db.select().from(telegramLinks)
      .where(and(eq(telegramLinks.telegramChatId, chatId), eq(telegramLinks.isActive, true)))
      .limit(1);
    return link || null;
  }

  async createTelegramLink(data: { userId: string; telegramChatId: string; telegramUsername?: string; threadId: number }): Promise<TelegramLink> {
    const existingByChatId = await this.getTelegramLinkByChatId(data.telegramChatId);
    if (existingByChatId && existingByChatId.userId !== data.userId) {
      await db.delete(telegramLinks).where(eq(telegramLinks.telegramChatId, data.telegramChatId));
    }
    await db.delete(telegramLinks).where(eq(telegramLinks.userId, data.userId));
    const [link] = await db.insert(telegramLinks).values({
      userId: data.userId,
      telegramChatId: data.telegramChatId,
      telegramUsername: data.telegramUsername || null,
      threadId: data.threadId,
      isActive: true,
    }).returning();
    return link;
  }

  async deleteTelegramLink(userId: string): Promise<void> {
    await db.delete(telegramLinks).where(eq(telegramLinks.userId, userId));
  }

  async createLinkCode(userId: string, platform: string): Promise<string> {
    await db.delete(linkCodes).where(and(eq(linkCodes.userId, userId), eq(linkCodes.platform, platform), isNull(linkCodes.usedAt)));
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(linkCodes).values({ userId, code, platform, expiresAt });
    return code;
  }

  async consumeLinkCode(code: string): Promise<{ userId: string; platform: string } | null> {
    const [row] = await db.select().from(linkCodes)
      .where(and(eq(linkCodes.code, code), isNull(linkCodes.usedAt), gte(linkCodes.expiresAt, new Date())))
      .limit(1);
    if (!row) return null;
    await db.update(linkCodes).set({ usedAt: new Date() }).where(eq(linkCodes.id, row.id));
    return { userId: row.userId, platform: row.platform };
  }

  async getAppSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    if (!row) return null;
    return decrypt(row.valueEncrypted);
  }

  async setAppSetting(key: string, value: string): Promise<void> {
    const encrypted = encrypt(value);
    const [existing] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    if (existing) {
      await db.update(appSettings).set({ valueEncrypted: encrypted, updatedAt: new Date() }).where(eq(appSettings.key, key));
    } else {
      await db.insert(appSettings).values({ key, valueEncrypted: encrypted });
    }
  }

  async deleteAppSetting(key: string): Promise<void> {
    await db.delete(appSettings).where(eq(appSettings.key, key));
  }
}

import { driver } from "./db";
import { SqliteStorage } from "./storage-sqlite";

function createStorage(): IStorage {
  if (driver === "sqlite") {
    return new SqliteStorage();
  }
  return new DatabaseStorage();
}

export const storage = createStorage();
