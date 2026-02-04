import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("rss"),
  url: text("url").notNull().unique(),
  topic: text("topic").notNull().default("ai_art"),
  rulesJson: jsonb("rules_json").notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  createdAt: true,
});

export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => sources.id),
  externalId: text("external_id"),
  url: text("url").notNull().unique(),
  title: text("title"),
  author: text("author"),
  contentText: text("content_text").notNull(),
  tagsJson: jsonb("tags_json").notNull().default([]),
  status: text("status").notNull().default("new"),
  publishedAt: timestamp("published_at"),
  insertedAt: timestamp("inserted_at").notNull().defaultNow(),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  insertedAt: true,
});

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export const analysis = pgTable("analysis", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id).unique(),
  category: text("category").notNull(),
  relevanceScore: integer("relevance_score").notNull(),
  replyWorthinessScore: integer("reply_worthiness_score").notNull(),
  linkFitScore: integer("link_fit_score").notNull(),
  riskFlagsJson: jsonb("risk_flags_json").notNull().default([]),
  recommendedAction: text("recommended_action").notNull(),
  suggestedAngle: text("suggested_angle").notNull().default(""),
  summaryShort: text("summary_short").notNull(),
  summaryLong: text("summary_long").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAnalysisSchema = createInsertSchema(analysis).omit({
  id: true,
  createdAt: true,
});

export type Analysis = typeof analysis.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id),
  variant: text("variant").notNull(),
  draftText: text("draft_text").notNull(),
  includesLink: boolean("includes_link").notNull().default(false),
  linkType: text("link_type").notNull().default("none"),
  tone: text("tone").notNull().default("helpful"),
  adminDecision: text("admin_decision").notNull().default("pending"),
  finalText: text("final_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDraftSchema = createInsertSchema(drafts).omit({
  id: true,
  createdAt: true,
});

export type Draft = typeof drafts.$inferSelect;
export type InsertDraft = z.infer<typeof insertDraftSchema>;

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  draftId: integer("draft_id").notNull().references(() => drafts.id),
  postedAt: timestamp("posted_at").notNull().defaultNow(),
  resultJson: jsonb("result_json").notNull().default({}),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  postedAt: true,
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull().default("ai_art"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  itemsCount: integer("items_count").notNull().default(0),
  itemIdsJson: jsonb("item_ids_json").notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});
