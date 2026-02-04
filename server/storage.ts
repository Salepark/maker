import { db } from "./db";
import { sources, items, analysis, drafts, posts, type Source, type Item, type Analysis, type Draft, type Post, type InsertSource, type InsertItem, type InsertAnalysis, type InsertDraft } from "@shared/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";

export interface IStorage {
  getStats(): Promise<{
    total: number;
    new: number;
    analyzed: number;
    drafted: number;
    approved: number;
    posted: number;
    skipped: number;
  }>;

  getSources(): Promise<(Source & { itemCount: number })[]>;
  getSource(id: number): Promise<Source | undefined>;
  createSource(data: InsertSource): Promise<Source>;
  updateSource(id: number, data: Partial<InsertSource>): Promise<Source | undefined>;
  deleteSource(id: number): Promise<void>;

  getItems(status?: string): Promise<(Item & { sourceName: string; relevanceScore?: number; replyWorthinessScore?: number })[]>;
  getRecentItems(limit?: number): Promise<(Item & { sourceName: string })[]>;
  getItem(id: number): Promise<(Item & { sourceName: string; analysis?: Analysis; drafts: Draft[] }) | undefined>;
  getItemsByStatus(status: string, limit?: number): Promise<(Item & { sourceName: string; rulesJson?: unknown })[]>;
  createItem(data: InsertItem): Promise<Item>;
  updateItemStatus(id: number, status: string): Promise<void>;

  createAnalysis(data: InsertAnalysis): Promise<Analysis>;
  getAnalysisByItemId(itemId: number): Promise<Analysis | undefined>;

  getDrafts(decision?: string): Promise<(Draft & { itemTitle: string; itemUrl: string; sourceName: string })[]>;
  getDraftsByItemId(itemId: number): Promise<Draft[]>;
  createDraft(data: InsertDraft): Promise<Draft>;
  updateDraftDecision(id: number, decision: string, finalText?: string): Promise<void>;
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

    const stats = {
      total: 0,
      new: 0,
      analyzed: 0,
      drafted: 0,
      approved: 0,
      posted: 0,
      skipped: 0,
    };

    for (const row of result) {
      const c = Number(row.count);
      stats.total += c;
      if (row.status in stats) {
        (stats as any)[row.status] = c;
      }
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

  async getItemsByStatus(status: string, limit: number = 10): Promise<(Item & { sourceName: string; rulesJson?: unknown })[]> {
    const result = await db
      .select({
        item: items,
        sourceName: sources.name,
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
    await db.update(drafts).set({ adminDecision: decision, finalText }).where(eq(drafts.id, id));
  }
}

export const storage = new DatabaseStorage();
