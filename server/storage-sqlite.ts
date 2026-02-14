import { db } from "./db";
import {
  sources, items, analysis, drafts, posts, reports, chatMessages, chatThreads, settings,
  presets, profiles, profileSources, outputs, outputItems,
  bots, botSettings, sourceBotLinks, llmProviders, jobRuns,
  permissions, auditLogs, reportMetrics, ruleMemories,
} from "../shared/schema.sqlite";
import type {
  Source, Item, Analysis, Draft, Post, Report,
  InsertSource, InsertItem, InsertAnalysis, InsertDraft, InsertReport,
  ChatMessage, InsertChatMessage, ChatThread, InsertChatThread, Setting,
  Preset, InsertPreset, Profile, InsertProfile,
  Output, InsertOutput, OutputItem,
  Bot, InsertBot, BotSettings, InsertBotSettings, SourceBotLink,
  LlmProvider, InsertLlmProvider,
  JobRun, InsertJobRun, Permission, RuleMemory,
} from "@shared/schema";
import type { IStorage } from "./storage";
import { eq, desc, sql, and, count, gte, lt, lte, or, isNull, inArray } from "drizzle-orm";

export class SqliteStorage implements IStorage {
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
    })) as any;
  }

  async getSource(id: number): Promise<Source | undefined> {
    const [source] = await db.select().from(sources).where(eq(sources.id, id));
    return source as any;
  }

  async createSource(data: InsertSource): Promise<Source> {
    const [source] = await db.insert(sources).values(data as any).returning();
    return source as any;
  }

  async updateSource(id: number, data: Partial<InsertSource>): Promise<Source | undefined> {
    const [source] = await db.update(sources).set(data as any).where(eq(sources.id, id)).returning();
    return source as any;
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
    })) as any;
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
    })) as any;
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
    } as any;
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
    })) as any;
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
    })) as any;
  }

  async createItem(data: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(data as any).returning();
    return item as any;
  }

  async findItemByDedupeKey(sourceId: number, url: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items)
      .where(and(eq(items.sourceId, sourceId), eq(items.url, url)))
      .limit(1);
    return item as any;
  }

  async updateItemStatus(id: number, status: string): Promise<void> {
    await db.update(items).set({ status }).where(eq(items.id, id));
  }

  async createAnalysis(data: InsertAnalysis): Promise<Analysis> {
    const [result] = await db.insert(analysis).values(data as any).returning();
    return result as any;
  }

  async getAnalysisByItemId(itemId: number): Promise<Analysis | undefined> {
    const [result] = await db.select().from(analysis).where(eq(analysis.itemId, itemId));
    return result as any;
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
    })) as any;
  }

  async getDraftsByItemId(itemId: number): Promise<Draft[]> {
    return db.select().from(drafts).where(eq(drafts.itemId, itemId)).orderBy(drafts.variant) as any;
  }

  async createDraft(data: InsertDraft): Promise<Draft> {
    const [draft] = await db.insert(drafts).values(data as any).returning();
    return draft as any;
  }

  async updateDraftDecision(id: number, decision: string, finalText?: string): Promise<void> {
    await db.update(drafts).set({ adminDecision: decision, finalText }).where(eq(drafts.id, id));

    const [draft] = await db.select({ itemId: drafts.itemId }).from(drafts).where(eq(drafts.id, id));

    if (draft && decision === "approved") {
      await db.update(items).set({ status: "approved" }).where(eq(items.id, draft.itemId));
    }
  }

  async getReports(limit: number = 20): Promise<Report[]> {
    return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(limit) as any;
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report as any;
  }

  async createReport(data: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values(data as any).returning();
    return report as any;
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
    return thread as any;
  }

  async getThread(threadId: number, userId: string): Promise<ChatThread | null> {
    const [thread] = await db.select().from(chatThreads)
      .where(and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId)));
    return (thread as any) || null;
  }

  async getUserThreads(userId: string): Promise<ChatThread[]> {
    return db.select().from(chatThreads)
      .where(eq(chatThreads.userId, userId))
      .orderBy(desc(chatThreads.createdAt)) as any;
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
      .orderBy(desc(chatMessages.createdAt)).limit(limit) as any;
  }

  async addThreadMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data as any).returning();
    return msg as any;
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
      .orderBy(desc(chatMessages.createdAt)).limit(limit) as any;
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values(data as any).returning();
    return msg as any;
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

  async listPresets(): Promise<Preset[]> {
    return db.select().from(presets).orderBy(presets.name) as any;
  }

  async getPresetById(id: number): Promise<Preset | undefined> {
    const [preset] = await db.select().from(presets).where(eq(presets.id, id));
    return preset as any;
  }

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
    })) as any;
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
    } as any;
  }

  async getProfileById(id: number): Promise<Profile | undefined> {
    const [result] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id));
    return result as any;
  }

  async getProfileByUserAndTopic(userId: string, topic: string): Promise<Profile | undefined> {
    const [result] = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.userId, userId), eq(profiles.topic, topic)))
      .orderBy(desc(profiles.createdAt))
      .limit(1);
    return result as any;
  }

  async createProfile(data: InsertProfile): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(data as any).returning();
    return profile as any;
  }

  async updateProfile(id: number, userId: string, patch: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [profile] = await db
      .update(profiles)
      .set(patch as any)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .returning();
    return profile as any;
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

  async listSources(userId: string, topic?: string): Promise<Source[]> {
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
      .orderBy(desc(sources.isDefault), sources.name) as any;
  }

  async getUserSource(id: number, userId: string): Promise<Source | undefined> {
    const [source] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.id, id), eq(sources.userId, userId)));
    return source as any;
  }

  async createUserSource(userId: string, data: Omit<InsertSource, 'userId'>): Promise<Source> {
    const [source] = await db.insert(sources).values({ ...data, userId } as any).returning();
    return source as any;
  }

  async updateUserSource(userId: string, sourceId: number, patch: Partial<InsertSource>): Promise<Source | undefined> {
    const [source] = await db
      .update(sources)
      .set(patch as any)
      .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
      .returning();
    return source as any;
  }

  async deleteUserSource(userId: string, sourceId: number): Promise<void> {
    await db.delete(sources).where(and(eq(sources.id, sourceId), eq(sources.userId, userId)));
  }

  async getProfileSources(profileId: number, userId: string): Promise<Source[]> {
    const profile = await this.getProfile(profileId, userId);
    if (!profile) return [];

    const result = await db
      .select({ source: sources })
      .from(profileSources)
      .innerJoin(sources, eq(profileSources.sourceId, sources.id))
      .where(eq(profileSources.profileId, profileId));

    return result.map(r => r.source) as any;
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

    return result.map(r => ({ ...r.source, weight: r.weight, isEnabled: r.isEnabled })) as any;
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
    })) as any;
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
      eq(items.status, "analyzed"),
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
    })) as any;
  }

  async listAnalyzedItemsForReport(params: {
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

    return rows as any;
  }

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
    const [output] = await db.insert(outputs).values(data as any).returning();
    return output as any;
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
      .limit(50) as any;
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

    return (rows[0] as any) ?? null;
  }

  async updateOutputContent(outputId: number, patch: { contentText: string; title: string; reportStage: string }): Promise<Output | null> {
    const [updated] = await db
      .update(outputs)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(outputs.id, outputId))
      .returning();
    return (updated as any) ?? null;
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
    return result as any;
  }

  async updateProfileLastRunAt(profileId: number, runAt: Date): Promise<void> {
    await db
      .update(profiles)
      .set({ lastRunAt: runAt })
      .where(eq(profiles.id, profileId));
  }

  async listBots(userId: string): Promise<(Bot & { settings: BotSettings | null })[]> {
    const botsData = await db
      .select()
      .from(bots)
      .where(eq(bots.userId, userId))
      .orderBy(desc(bots.createdAt));

    const result: (Bot & { settings: BotSettings | null })[] = [];
    for (const bot of botsData) {
      const [s] = await db
        .select()
        .from(botSettings)
        .where(eq(botSettings.botId, bot.id))
        .limit(1);
      result.push({ ...bot, settings: s ?? null } as any);
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

    const [s] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.botId, bot.id))
      .limit(1);

    return { ...bot, settings: s ?? null } as any;
  }

  async getBotByKey(userId: string, key: string): Promise<Bot | undefined> {
    const [bot] = await db
      .select()
      .from(bots)
      .where(and(eq(bots.userId, userId), eq(bots.key, key)))
      .limit(1);
    return bot as any;
  }

  async createBot(data: InsertBot): Promise<Bot> {
    const [bot] = await db.insert(bots).values(data as any).returning();
    return bot as any;
  }

  async updateBot(id: number, userId: string, patch: Partial<InsertBot>): Promise<Bot | undefined> {
    const [updated] = await db
      .update(bots)
      .set(patch as any)
      .where(and(eq(bots.id, id), eq(bots.userId, userId)))
      .returning();
    return updated as any;
  }

  async deleteBot(id: number, userId: string): Promise<void> {
    await db.delete(bots).where(and(eq(bots.id, id), eq(bots.userId, userId)));
  }

  async getBotSettings(botId: number): Promise<BotSettings | undefined> {
    const [s] = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.botId, botId))
      .limit(1);
    return s as any;
  }

  async createBotSettings(data: InsertBotSettings): Promise<BotSettings> {
    const [s] = await db.insert(botSettings).values(data as any).returning();
    return s as any;
  }

  async updateBotSettings(botId: number, patch: Partial<Omit<InsertBotSettings, 'botId'>>): Promise<BotSettings | undefined> {
    const [updated] = await db
      .update(botSettings)
      .set({ ...patch, updatedAt: new Date() } as any)
      .where(eq(botSettings.botId, botId))
      .returning();
    return updated as any;
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
    })) as any;
  }

  async setBotSources(botId: number, userId: string, sourceData: Array<{ sourceId: number; weight?: number; isEnabled?: boolean }>): Promise<void> {
    const [bot] = await db.select().from(bots).where(and(eq(bots.id, botId), eq(bots.userId, userId))).limit(1);
    if (!bot) throw new Error("Bot not found or access denied");

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

    await db.delete(sourceBotLinks).where(eq(sourceBotLinks.botId, botId));

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

  async ensureDefaultBots(userId: string): Promise<Bot[]> {
    const existingBots = await db.select().from(bots).where(eq(bots.userId, userId));
    if (existingBots.length > 0) {
      return existingBots as any;
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
      } as any);

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
      } as any);

      createdBots.push(bot as any);
    }

    return createdBots;
  }

  async createLlmProvider(data: InsertLlmProvider): Promise<LlmProvider> {
    const [provider] = await db.insert(llmProviders).values(data as any).returning();
    return provider as any;
  }

  async listLlmProviders(userId: string): Promise<LlmProvider[]> {
    return db.select().from(llmProviders).where(eq(llmProviders.userId, userId)).orderBy(desc(llmProviders.createdAt)) as any;
  }

  async getLlmProvider(id: number, userId: string): Promise<LlmProvider | undefined> {
    const [provider] = await db.select().from(llmProviders).where(and(eq(llmProviders.id, id), eq(llmProviders.userId, userId)));
    return provider as any;
  }

  async updateLlmProvider(id: number, userId: string, patch: Partial<Omit<InsertLlmProvider, 'userId'>>): Promise<LlmProvider | undefined> {
    const [updated] = await db.update(llmProviders)
      .set(patch as any)
      .where(and(eq(llmProviders.id, id), eq(llmProviders.userId, userId)))
      .returning();
    return updated as any;
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
    return source as any;
  }

  async createBotFromPreset(params: {
    userId: string;
    key: string;
    name: string;
    settings: Partial<Omit<InsertBotSettings, 'botId'>>;
    sourceData: Array<{ name: string; url: string; type?: string; topic: string }>;
  }): Promise<Bot> {
    return await db.transaction(async (tx: any) => {
      const [bot] = await tx.insert(bots).values({
        userId: params.userId,
        key: params.key,
        name: params.name,
        isEnabled: true,
      }).returning();

      await tx.insert(botSettings).values({
        botId: bot.id,
        ...params.settings,
      } as any);

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

      return bot as Bot;
    });
  }

  async getBotByUserAndKey(userId: string, key: string): Promise<Bot | undefined> {
    const [bot] = await db.select().from(bots)
      .where(and(eq(bots.userId, userId), eq(bots.key, key)));
    return bot as any;
  }

  async resolveLLMForProfile(userId: string, topic: string): Promise<{ providerType: string; apiKey: string; baseUrl: string | null; model: string | null } | null> {
    const bot = await this.getBotByUserAndKey(userId, topic);
    if (!bot) return null;
    return this.resolveLLMForBot(bot.id);
  }

  async createJobRun(data: Omit<InsertJobRun, 'id'>): Promise<JobRun> {
    const [run] = await db.insert(jobRuns).values(data as any).returning();
    return run as any;
  }

  async finishJobRun(id: number, patch: Partial<InsertJobRun>): Promise<JobRun | null> {
    const [run] = await db.update(jobRuns).set(patch as any).where(eq(jobRuns.id, id)).returning();
    return (run as any) || null;
  }

  async listJobRunsForBot(userId: string, botId: number, limit: number = 20): Promise<JobRun[]> {
    return db.select().from(jobRuns)
      .where(and(eq(jobRuns.userId, userId), eq(jobRuns.botId, botId)))
      .orderBy(desc(jobRuns.startedAt))
      .limit(limit) as any;
  }

  async getLastJobRunForBot(userId: string, botId: number): Promise<JobRun | null> {
    const [run] = await db.select().from(jobRuns)
      .where(and(eq(jobRuns.userId, userId), eq(jobRuns.botId, botId)))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1);
    return (run as any) || null;
  }

  async listPermissions(userId: string, scope: string, scopeId: number | null): Promise<Permission[]> {
    const conditions = [eq(permissions.userId, userId), eq(permissions.scope, scope)];
    if (scopeId != null) {
      conditions.push(eq(permissions.scopeId, scopeId));
    } else {
      conditions.push(isNull(permissions.scopeId));
    }
    return db.select().from(permissions).where(and(...conditions)) as any;
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
      return updated as any;
    }

    const [created] = await db.insert(permissions)
      .values({ userId, scope, scopeId, permissionKey, valueJson, updatedAt: new Date() } as any)
      .returning();
    return created as any;
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
      .orderBy(permissions.scope, permissions.permissionKey) as any;
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
      .limit(filters?.limit ?? 50) as any;
  }

  async createReportMetric(data: { reportId: number; profileId: number; itemCount: number; keywordSummary: Record<string, number>; sourceDistribution: Record<string, number> }): Promise<any> {
    const result = await db.insert(reportMetrics).values({
      reportId: data.reportId,
      profileId: data.profileId,
      itemCount: data.itemCount,
      keywordSummary: data.keywordSummary as any,
      sourceDistribution: data.sourceDistribution as any,
    }).returning();
    return result[0];
  }

  async getReportMetricsForProfile(profileId: number, limit: number = 7): Promise<any[]> {
    return db.select().from(reportMetrics)
      .where(eq(reportMetrics.profileId, profileId))
      .orderBy(desc(reportMetrics.createdAt))
      .limit(limit);
  }

  async listRuleMemories(userId: string, scope: string, scopeId: number | null): Promise<RuleMemory[]> {
    const conditions = [eq(ruleMemories.userId, userId), eq(ruleMemories.scope, scope)];
    if (scopeId != null) {
      conditions.push(eq(ruleMemories.scopeId, scopeId));
    } else {
      conditions.push(isNull(ruleMemories.scopeId));
    }
    return db.select().from(ruleMemories).where(and(...conditions)).orderBy(ruleMemories.key) as any;
  }

  async listAllUserRuleMemories(userId: string): Promise<RuleMemory[]> {
    return db.select().from(ruleMemories)
      .where(eq(ruleMemories.userId, userId))
      .orderBy(ruleMemories.scope, ruleMemories.key) as any;
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
      return updated as any;
    }

    const [created] = await db.insert(ruleMemories)
      .values({ userId, scope, scopeId, key, valueJson, updatedAt: new Date() } as any)
      .returning();
    return created as any;
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
}
