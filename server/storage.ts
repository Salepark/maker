import { db } from "./db";
import { 
  sources, items, analysis, drafts, posts, reports, chatMessages, settings,
  presets, profiles, profileSources, outputs, outputItems,
  bots, botSettings, sourceBotLinks, llmProviders,
  type Source, type Item, type Analysis, type Draft, type Post, type Report, 
  type InsertSource, type InsertItem, type InsertAnalysis, type InsertDraft, type InsertReport, 
  type ChatMessage, type InsertChatMessage, type Setting,
  type Preset, type InsertPreset, type Profile, type InsertProfile, 
  type Output, type InsertOutput, type OutputItem,
  type Bot, type InsertBot, type BotSettings, type InsertBotSettings, type SourceBotLink,
  type LlmProvider, type InsertLlmProvider
} from "@shared/schema";
import { eq, desc, sql, and, count, gte, lt, lte, or, isNull, inArray } from "drizzle-orm";

export interface IStorage {
  getStats(): Promise<{
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

  getItems(status?: string): Promise<(Item & { sourceName: string; relevanceScore?: number; replyWorthinessScore?: number })[]>;
  getRecentItems(limit?: number): Promise<(Item & { sourceName: string })[]>;
  getObserveItems(limit?: number): Promise<any[]>;
  getItem(id: number): Promise<(Item & { sourceName: string; analysis?: Analysis; drafts: Draft[] }) | undefined>;
  getItemsByStatus(status: string, limit?: number): Promise<(Item & { sourceName: string; sourceTopic: string; rulesJson?: unknown })[]>;
  createItem(data: InsertItem): Promise<Item>;
  updateItemStatus(id: number, status: string): Promise<void>;

  createAnalysis(data: InsertAnalysis): Promise<Analysis>;
  getAnalysisByItemId(itemId: number): Promise<Analysis | undefined>;

  getDrafts(decision?: string): Promise<(Draft & { itemTitle: string; itemUrl: string; sourceName: string })[]>;
  getDraftsByItemId(itemId: number): Promise<Draft[]>;
  createDraft(data: InsertDraft): Promise<Draft>;
  updateDraftDecision(id: number, decision: string, finalText?: string): Promise<void>;

  getReports(limit?: number): Promise<Report[]>;
  getReport(id: number): Promise<Report | undefined>;
  createReport(data: InsertReport): Promise<Report>;
  getAnalyzedItemsForBrief(lookbackHours: number, limit: number, topic?: string): Promise<any[]>;

  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessageStatus(id: number, userId: string, status: string): Promise<void>;
  getActiveBotId(userId: string): Promise<number | null>;
  setActiveBotId(userId: string, botId: number | null): Promise<void>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;

  // Presets
  listPresets(): Promise<Preset[]>;
  getPresetById(id: number): Promise<Preset | undefined>;

  // Profiles
  listProfiles(userId: string): Promise<(Profile & { presetName: string })[]>;
  getProfile(id: number, userId: string): Promise<(Profile & { presetName: string }) | undefined>;
  getProfileById(id: number): Promise<Profile | undefined>;
  createProfile(data: InsertProfile): Promise<Profile>;
  updateProfile(id: number, userId: string, patch: Partial<InsertProfile>): Promise<Profile | undefined>;
  deleteProfile(id: number, userId: string): Promise<void>;
  cloneProfile(id: number, userId: string): Promise<Profile | undefined>;

  // Sources (updated for userId support)
  listSources(userId: string, topic?: string): Promise<Source[]>;
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
  getItemsForReport(topic: string, sourceIds: number[], lookbackHours: number, limit: number): Promise<(Item & { importanceScore: number; sourceName: string })[]>;
  listAnalyzedItemsForReport(params: {
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
  }>>;
  
  // Outputs (new unified table) management
  createOutputRecord(data: InsertOutput): Promise<Output>;
  outputExists(profileId: number, periodStart: Date, periodEnd: Date): Promise<boolean>;
  linkOutputItems(outputId: number, itemIds: number[]): Promise<void>;
  listOutputs(params: { userId: string; profileId?: number; from?: Date; to?: Date }): Promise<Output[]>;
  getOutputById(params: { userId: string; outputId: number }): Promise<Output | null>;
  updateProfileLastRunAt(profileId: number, runAt: Date): Promise<void>;

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

  // Default bot creation on first login
  ensureDefaultBots(userId: string): Promise<Bot[]>;

  // ============================================
  // LLM PROVIDERS - Phase 3 BYO LLM
  // ============================================
  createLlmProvider(data: InsertLlmProvider): Promise<LlmProvider>;
  listLlmProviders(userId: string): Promise<LlmProvider[]>;
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
}

export class DatabaseStorage implements IStorage {
  async getStats() {
    const result = await db
      .select({
        status: items.status,
        count: count(),
      })
      .from(items)
      .groupBy(items.status);

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

    const lastCollect = await db
      .select({ insertedAt: items.insertedAt })
      .from(items)
      .orderBy(desc(items.insertedAt))
      .limit(1);
    
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

  async getItems(status?: string): Promise<(Item & { sourceName: string; relevanceScore?: number; replyWorthinessScore?: number })[]> {
    let query = db
      .select({
        item: items,
        sourceName: sources.name,
        relevanceScore: analysis.relevanceScore,
        replyWorthinessScore: analysis.replyWorthinessScore,
      })
      .from(items)
      .leftJoin(sources, eq(items.sourceId, sources.id))
      .leftJoin(analysis, eq(analysis.itemId, items.id))
      .orderBy(desc(items.insertedAt));

    if (status && status !== "all") {
      query = query.where(eq(items.status, status)) as any;
    }

    const result = await query;
    return result.map((r) => ({
      ...r.item,
      sourceName: r.sourceName || "Unknown",
      relevanceScore: r.relevanceScore ?? undefined,
      replyWorthinessScore: r.replyWorthinessScore ?? undefined,
    }));
  }

  async getRecentItems(limit: number = 10): Promise<(Item & { sourceName: string })[]> {
    const result = await db
      .select({
        item: items,
        sourceName: sources.name,
      })
      .from(items)
      .leftJoin(sources, eq(items.sourceId, sources.id))
      .orderBy(desc(items.insertedAt))
      .limit(limit);

    return result.map((r) => ({
      ...r.item,
      sourceName: r.sourceName || "Unknown",
    }));
  }

  async getObserveItems(limit: number = 50): Promise<any[]> {
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
      .leftJoin(sources, eq(items.sourceId, sources.id))
      .leftJoin(analysis, eq(items.id, analysis.itemId))
      .where(
        and(
          eq(items.status, "skipped"),
          gte(analysis.relevanceScore, 60),
          lt(analysis.replyWorthinessScore, 50)
        )
      )
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

  async getItem(id: number): Promise<(Item & { sourceName: string; analysis?: Analysis; drafts: Draft[] }) | undefined> {
    const [itemResult] = await db
      .select({
        item: items,
        sourceName: sources.name,
      })
      .from(items)
      .leftJoin(sources, eq(items.sourceId, sources.id))
      .where(eq(items.id, id));

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
      sourceTopic: r.sourceTopic || "ai_art",
      rulesJson: r.rulesJson,
    }));
  }

  async createItem(data: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(data).returning();
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

  async getDrafts(decision?: string): Promise<(Draft & { itemTitle: string; itemUrl: string; sourceName: string })[]> {
    let query = db
      .select({
        draft: drafts,
        itemTitle: items.title,
        itemUrl: items.url,
        sourceName: sources.name,
      })
      .from(drafts)
      .innerJoin(items, eq(drafts.itemId, items.id))
      .leftJoin(sources, eq(items.sourceId, sources.id))
      .orderBy(desc(drafts.createdAt));

    if (decision && decision !== "all") {
      query = query.where(eq(drafts.adminDecision, decision)) as any;
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

  async getChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt)).limit(limit);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data).returning();
    return msg;
  }

  async updateChatMessageStatus(id: number, userId: string, status: string): Promise<void> {
    await db.update(chatMessages)
      .set({ status })
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)));
  }

  async getActiveBotId(userId: string): Promise<number | null> {
    const val = await this.getSetting(`active_bot_${userId}`);
    return val ? parseInt(val, 10) : null;
  }

  async setActiveBotId(userId: string, botId: number | null): Promise<void> {
    if (botId === null) {
      await db.delete(settings).where(eq(settings.key, `active_bot_${userId}`));
    } else {
      await this.setSetting(`active_bot_${userId}`, String(botId));
    }
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
    // Return: system default sources (userId is null) + user's sources
    const conditions = [
      or(isNull(sources.userId), eq(sources.userId, userId))
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
    topic: string,
    sourceIds: number[],
    lookbackHours: number,
    limit: number
  ): Promise<(Item & { importanceScore: number; sourceName: string })[]> {
    if (sourceIds.length === 0) return [];

    const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const result = await db
      .select({
        item: items,
        importanceScore: analysis.importanceScore,
        sourceName: sources.name,
      })
      .from(items)
      .innerJoin(analysis, eq(items.id, analysis.itemId))
      .innerJoin(sources, eq(items.sourceId, sources.id))
      .where(and(
        eq(items.topic, topic),
        eq(items.status, "analyzed"),
        inArray(items.sourceId, sourceIds),
        gte(items.publishedAt, cutoff)
      ))
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
          eq(items.topic, params.topic),
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
    const rows = await db
      .select({ id: outputs.id })
      .from(outputs)
      .where(and(
        eq(outputs.profileId, profileId),
        eq(outputs.periodStart, periodStart),
        eq(outputs.periodEnd, periodEnd)
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

  // Default bot creation on first login
  async ensureDefaultBots(userId: string): Promise<Bot[]> {
    const existingBots = await db.select().from(bots).where(eq(bots.userId, userId));
    if (existingBots.length > 0) {
      return existingBots;
    }

    // Create default bots: ai_art and investing
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

      // Create default settings for this bot
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

      // Link default sources for this topic
      const defaultSources = await db
        .select()
        .from(sources)
        .where(and(eq(sources.isDefault, true), eq(sources.topic, botDef.key)));

      if (defaultSources.length > 0) {
        await db.insert(sourceBotLinks).values(
          defaultSources.map(s => ({
            botId: bot.id,
            sourceId: s.id,
            weight: 3,
            isEnabled: true,
          }))
        );
      }

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
    if (!setting || !setting.llmProviderId) return null;

    const [provider] = await db.select().from(llmProviders).where(eq(llmProviders.id, setting.llmProviderId));
    if (!provider) return null;

    const { decrypt } = await import("./lib/crypto");
    return {
      providerType: provider.providerType,
      apiKey: decrypt(provider.apiKeyEncrypted),
      baseUrl: provider.baseUrl,
      model: setting.modelOverride || provider.defaultModel,
    };
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
}

export const storage = new DatabaseStorage();
