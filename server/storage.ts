import { db } from "./db";
import { 
  sources, items, analysis, drafts, posts, reports, chatMessages, settings,
  presets, profiles, profileSources, outputItems,
  type Source, type Item, type Analysis, type Draft, type Post, type Report, 
  type InsertSource, type InsertItem, type InsertAnalysis, type InsertDraft, type InsertReport, 
  type ChatMessage, type InsertChatMessage, type Setting,
  type Preset, type InsertPreset, type Profile, type InsertProfile, type OutputItem
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

  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;

  // Presets
  listPresets(): Promise<Preset[]>;
  getPresetById(id: number): Promise<Preset | undefined>;

  // Profiles
  listProfiles(userId: string): Promise<(Profile & { presetName: string })[]>;
  getProfile(id: number, userId: string): Promise<(Profile & { presetName: string }) | undefined>;
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
  setProfileSources(profileId: number, userId: string, sourceIds: number[]): Promise<void>;

  // Report Job helpers
  getActiveReportProfiles(): Promise<(Profile & { presetOutputType: string })[]>;
  getProfileSourceIds(profileId: number): Promise<number[]>;
  getItemsForReport(topic: string, sourceIds: number[], lookbackHours: number, limit: number): Promise<(Item & { importanceScore: number; sourceName: string })[]>;
  
  // Outputs (reports) management
  createOutput(data: InsertReport): Promise<Report>;
  outputExists(profileId: number, periodStart: Date, periodEnd: Date): Promise<boolean>;
  linkOutputItems(reportId: number, itemIds: number[]): Promise<void>;
  listReportsByProfile(profileId: number, from?: Date, to?: Date): Promise<Report[]>;
  updateProfileLastRunAt(profileId: number, runAt: Date): Promise<void>;
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

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(limit);
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
    
    // Also clone profile sources
    const existingSources = await this.getProfileSources(id, userId);
    if (existingSources.length > 0) {
      await this.setProfileSources(newProfile.id, userId, existingSources.map(s => s.id));
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
    // First verify profile belongs to user
    const profile = await this.getProfile(profileId, userId);
    if (!profile) return [];

    const result = await db
      .select({ source: sources })
      .from(profileSources)
      .innerJoin(sources, eq(profileSources.sourceId, sources.id))
      .where(eq(profileSources.profileId, profileId));

    return result.map(r => r.source);
  }

  async setProfileSources(profileId: number, userId: string, sourceIds: number[]): Promise<void> {
    // First verify profile belongs to user
    const profile = await this.getProfile(profileId, userId);
    if (!profile) return;

    // Delete existing connections
    await db.delete(profileSources).where(eq(profileSources.profileId, profileId));

    // Insert new connections
    if (sourceIds.length > 0) {
      await db.insert(profileSources).values(
        sourceIds.map(sourceId => ({ profileId, sourceId }))
      );
    }
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

  // ============================================
  // OUTPUTS (REPORTS) MANAGEMENT
  // ============================================
  async createOutput(data: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(data).returning();
    return report;
  }

  async outputExists(profileId: number, periodStart: Date, periodEnd: Date): Promise<boolean> {
    const [existing] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(
        eq(reports.profileId, profileId),
        gte(reports.periodStart, periodStart),
        lte(reports.periodEnd, periodEnd)
      ))
      .limit(1);

    return !!existing;
  }

  async linkOutputItems(reportId: number, itemIds: number[]): Promise<void> {
    if (itemIds.length === 0) return;

    await db.insert(outputItems).values(
      itemIds.map((itemId, index) => ({
        reportId,
        itemId,
        rank: index + 1,
      }))
    );
  }

  async listReportsByProfile(profileId: number, from?: Date, to?: Date): Promise<Report[]> {
    const conditions = [eq(reports.profileId, profileId)];

    if (from) {
      conditions.push(gte(reports.createdAt, from));
    }
    if (to) {
      conditions.push(lte(reports.createdAt, to));
    }

    return db
      .select()
      .from(reports)
      .where(and(...conditions))
      .orderBy(desc(reports.createdAt));
  }

  async updateProfileLastRunAt(profileId: number, runAt: Date): Promise<void> {
    await db
      .update(profiles)
      .set({ lastRunAt: runAt })
      .where(eq(profiles.id, profileId));
  }
}

export const storage = new DatabaseStorage();
