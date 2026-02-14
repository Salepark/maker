import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, jsonb, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth schema (users and sessions tables)
export * from "./models/auth";
import { users } from "./models/auth";

// ============================================
// PRESETS - Bot type templates
// ============================================
export const presets = pgTable("presets", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  outputType: text("output_type").notNull(), // "report" | "draft" | "alert"
  description: text("description"),
  variantsJson: jsonb("variants_json").notNull().default([]),
  defaultConfigJson: jsonb("default_config_json").notNull().default({}),
  icon: text("icon"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPresetSchema = createInsertSchema(presets).omit({
  id: true,
  createdAt: true,
});

export type Preset = typeof presets.$inferSelect;
export type InsertPreset = z.infer<typeof insertPresetSchema>;

export interface PresetDefaultConfig {
  timezone?: string;
  scheduleRule?: "DAILY" | "WEEKDAYS" | "WEEKENDS";
  scheduleTimeLocal?: string;
  markdownLevel?: "minimal" | "normal";
  verbosity?: "short" | "normal" | "detailed";
  sections?: {
    tldr?: boolean;
    drivers?: boolean;
    risk?: boolean;
    checklist?: boolean;
    sources?: boolean;
    [key: string]: boolean | undefined;
  };
  filters?: {
    minImportanceScore?: number;
  };
  suggestedSources?: Array<{
    name: string;
    url: string;
    type?: string;
    topic: string;
  }>;
  requireHumanApproval?: boolean;
  promotionLevel?: "none" | "subtle" | "moderate";
  linkPolicy?: "no-links" | "allowed" | "cautious" | "optional";
  sourceDisclaimer?: string;
}

// ============================================
// PROFILES - User's bot settings (core table)
// ============================================
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  presetId: integer("preset_id").notNull().references(() => presets.id),
  name: text("name").notNull(),
  topic: text("topic").notNull(), // "investing" | "ai_art" | "tech"
  variantKey: text("variant_key"),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  scheduleCron: text("schedule_cron").notNull().default("0 7 * * *"),
  configJson: jsonb("config_json").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at"), // Last report generation time
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;

// ProfileConfig - configuration stored in profile.configJson
export interface ProfileConfig {
  scheduleRule?: "DAILY" | "WEEKDAYS" | "WEEKENDS";
  sections?: {
    tldr?: boolean;
    drivers?: boolean;
    risk?: boolean;
    checklist?: boolean;
    sources?: boolean;
  };
  verbosity?: "short" | "normal" | "detailed";
  markdownLevel?: "minimal" | "normal";
  filters?: {
    minImportanceScore?: number;
    maxRiskLevelAllowed?: number;
    allowPromotionLinks?: boolean;
  };
}

// ============================================
// SOURCES - Content input sources
// ============================================
export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id), // null = system default source
  name: text("name").notNull(),
  type: text("type").notNull().default("rss"),
  url: text("url").notNull().unique(),
  topic: text("topic").notNull().default("ai_art"),
  trustLevel: text("trust_level").notNull().default("medium"),
  region: text("region").notNull().default("global"),
  rulesJson: jsonb("rules_json").notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  createdAt: true,
});

export type Source = typeof sources.$inferSelect;
export type InsertSource = z.infer<typeof insertSourceSchema>;

// ============================================
// BOTS - User's bot instances (Step 8-1)
// ============================================
export const bots = pgTable("bots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  key: text("key").notNull(), // e.g., "ai_art", "investing"
  name: text("name").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("bots_user_key_unique").on(table.userId, table.key)
]);

export const insertBotSchema = createInsertSchema(bots).omit({
  id: true,
  createdAt: true,
});

export type Bot = typeof bots.$inferSelect;
export type InsertBot = z.infer<typeof insertBotSchema>;

// ============================================
// LLM_PROVIDERS - User's LLM API connections (Phase 3)
// ============================================
export const llmProviders = pgTable("llm_providers", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  providerType: text("provider_type").notNull(), // "openai" | "anthropic" | "google" | "custom"
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  baseUrl: text("base_url"),
  defaultModel: text("default_model"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLlmProviderSchema = createInsertSchema(llmProviders).omit({
  id: true,
  createdAt: true,
});

export type LlmProvider = typeof llmProviders.$inferSelect;
export type InsertLlmProvider = z.infer<typeof insertLlmProviderSchema>;

// ============================================
// BOT_SETTINGS - Bot settings 1:1 (Step 8-1 + Phase 3 LLM)
// ============================================
export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  botId: integer("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }).unique(), // 1:1 enforced
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  scheduleRule: text("schedule_rule").notNull().default("DAILY"), // DAILY, WEEKDAYS, WEEKENDS
  scheduleTimeLocal: text("schedule_time_local").notNull().default("07:00"), // HH:MM format
  format: text("format").notNull().default("clean"),
  markdownLevel: text("markdown_level").notNull().default("minimal"),
  verbosity: text("verbosity").notNull().default("normal"), // short, normal, detailed
  sectionsJson: jsonb("sections_json").notNull().default({
    tldr: true,
    drivers: true,
    risk: true,
    checklist: true,
    sources: true
  }),
  filtersJson: jsonb("filters_json").notNull().default({
    minImportanceScore: 0,
    maxRiskLevel: 100
  }),
  llmProviderId: integer("llm_provider_id").references(() => llmProviders.id, { onDelete: "set null" }),
  modelOverride: text("model_override"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BotSettings = typeof botSettings.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;

// BotSettingsConfig - typed structure for sectionsJson and filtersJson
export interface BotSectionsConfig {
  tldr?: boolean;
  drivers?: boolean;
  risk?: boolean;
  checklist?: boolean;
  sources?: boolean;
}

export interface BotFiltersConfig {
  minImportanceScore?: number;
  maxRiskLevel?: number;
}

// ============================================
// SOURCE_BOT_LINKS - Source ↔ Bot connection (Step 8-1)
// ============================================
export const sourceBotLinks = pgTable("source_bot_links", {
  sourceId: integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  botId: integer("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  weight: integer("weight").notNull().default(3), // 1-5
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.sourceId, table.botId] })
]);

export type SourceBotLink = typeof sourceBotLinks.$inferSelect;

// ============================================
// PROFILE_SOURCES - Profile ↔ Source connection (legacy, kept for compatibility)
// ============================================
export const profileSources = pgTable("profile_sources", {
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  sourceId: integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  weight: integer("weight").notNull().default(3), // 1-5, higher = more priority
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.profileId, table.sourceId] })
]);

export type ProfileSource = typeof profileSources.$inferSelect;

// Note: ProfileConfig is defined above after Profile type

// ============================================
// ITEMS - Collected content
// ============================================
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").references(() => sources.id),
  topic: text("topic").notNull().default("ai_art"), // Must match source.topic
  externalId: text("external_id"),
  url: text("url").notNull().unique(),
  title: text("title"),
  author: text("author"),
  contentText: text("content_text").notNull(),
  tagsJson: jsonb("tags_json").notNull().default([]),
  status: text("status").notNull().default("new"), // new | analyzed | processed
  publishedAt: timestamp("published_at"),
  collectedAt: timestamp("collected_at").notNull().defaultNow(), // renamed from insertedAt
  insertedAt: timestamp("inserted_at").notNull().defaultNow(), // keeping for backward compat
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  collectedAt: true,
  insertedAt: true,
});

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

// ============================================
// ANALYSIS - LLM analysis results
// ============================================
export const analysis = pgTable("analysis", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id).unique(),
  topic: text("topic").notNull().default("ai_art"), // Must match item.topic
  category: text("category").notNull(),
  relevanceScore: integer("relevance_score").notNull(),
  importanceScore: integer("importance_score").notNull().default(50), // Market/business impact
  riskScore: integer("risk_score").notNull().default(0),
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

// ============================================
// REPORTS - Generated reports (outputs)
// ============================================
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id), // nullable for backward compat
  topic: text("topic").notNull().default("ai_art"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  itemsCount: integer("items_count").notNull().default(0),
  itemIdsJson: jsonb("item_ids_json").notNull().default([]),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

// ============================================
// OUTPUTS - Universal output storage (reports, drafts, alerts)
// ============================================
export const outputs = pgTable(
  "outputs",
  {
    id: serial("id").primaryKey(),

    userId: varchar("user_id").notNull().references(() => users.id),
    profileId: integer("profile_id").notNull().references(() => profiles.id),
    presetId: integer("preset_id").notNull().references(() => presets.id),

    topic: text("topic").notNull(), // must match profile.topic
    outputType: text("output_type").notNull(), // "report" | "draft" | "alert"

    title: text("title").notNull(),
    contentText: text("content_text").notNull(),
    reportStage: text("report_stage").notNull().default("full"),

    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => ({
    // Prevent duplicate reports for the same profile + same period
    uqProfilePeriod: uniqueIndex("outputs_uq_profile_period").on(
      t.profileId,
      t.periodStart,
      t.periodEnd
    ),

    idxProfile: index("outputs_idx_profile").on(t.profileId),
    idxUser: index("outputs_idx_user").on(t.userId),
    idxTopic: index("outputs_idx_topic").on(t.topic),
  })
);

export const insertOutputSchema = createInsertSchema(outputs).omit({
  id: true,
  createdAt: true,
});

export type Output = typeof outputs.$inferSelect;
export type InsertOutput = z.infer<typeof insertOutputSchema>;

// ============================================
// OUTPUT_ITEMS - Output ↔ Item link (for precise tracking)
// ============================================
export const outputItems = pgTable(
  "output_items",
  {
    outputId: integer("output_id").notNull().references(() => outputs.id, { onDelete: "cascade" }),
    itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.outputId, t.itemId] }),
    idxOutput: index("output_items_idx_output").on(t.outputId),
    idxItem: index("output_items_idx_item").on(t.itemId),
  })
);

export type OutputItem = typeof outputItems.$inferSelect;

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

export const chatThreads = pgTable("chat_threads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title"),
  activeBotId: integer("active_bot_id").references(() => bots.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatThreadSchema = createInsertSchema(chatThreads).omit({
  id: true,
  createdAt: true,
});

export type ChatThread = typeof chatThreads.$inferSelect;
export type InsertChatThread = z.infer<typeof insertChatThreadSchema>;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").references(() => chatThreads.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  contentText: text("content_text").notNull(),
  kind: text("kind").default("text"),
  commandJson: jsonb("command_json"),
  resultJson: jsonb("result_json"),
  status: text("status").default("done"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Setting = typeof settings.$inferSelect;

// ============================================
// JOB RUNS - Execution log for all jobs
// ============================================
export const jobRuns = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  botId: integer("bot_id").references(() => bots.id),
  botKey: text("bot_key").notNull(),
  jobType: text("job_type").notNull(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  itemsCollected: integer("items_collected"),
  itemsAnalyzed: integer("items_analyzed"),
  outputId: integer("output_id"),
  reportStage: text("report_stage"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  errorDetailJson: jsonb("error_detail_json"),
  metaJson: jsonb("meta_json"),
}, (table) => [
  index("idx_job_runs_user_bot").on(table.userId, table.botId, table.startedAt),
  index("idx_job_runs_status").on(table.status, table.startedAt),
]);

export const insertJobRunSchema = createInsertSchema(jobRuns).omit({
  id: true,
});

export type JobRun = typeof jobRuns.$inferSelect;
export type InsertJobRun = z.infer<typeof insertJobRunSchema>;

// ============================================
// PERMISSIONS - Policy engine permission store
// ============================================
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  scope: text("scope").notNull(),
  scopeId: integer("scope_id"),
  permissionKey: text("permission_key").notNull(),
  valueJson: jsonb("value_json").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("permissions_scope_key_unique").on(table.userId, table.scope, table.scopeId, table.permissionKey),
  index("idx_permissions_user_scope").on(table.userId, table.scope, table.scopeId),
]);

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
});

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

// ============================================
// AUDIT LOG - Permission/action audit trail
// ============================================
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  botId: integer("bot_id").references(() => bots.id),
  threadId: text("thread_id"),
  eventType: text("event_type").notNull(),
  permissionKey: text("permission_key"),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_audit_logs_user").on(table.userId, table.createdAt),
  index("idx_audit_logs_event").on(table.eventType, table.createdAt),
]);

// ============================================
// REPORT METRICS - Memory layer for trend tracking
// ============================================
export const reportMetrics = pgTable("report_metrics", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  profileId: integer("profile_id").notNull(),
  itemCount: integer("item_count").notNull().default(0),
  keywordSummary: jsonb("keyword_summary").notNull().default({}),
  sourceDistribution: jsonb("source_distribution").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_report_metrics_profile").on(table.profileId, table.createdAt),
]);

export const insertReportMetricSchema = createInsertSchema(reportMetrics).omit({
  id: true,
  createdAt: true,
});

export type ReportMetric = typeof reportMetrics.$inferSelect;
export type InsertReportMetric = z.infer<typeof insertReportMetricSchema>;

// ============================================
// RULE MEMORIES - Long-term memory for user preferences/rules
// ============================================
export const ruleMemories = pgTable("rule_memories", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  scope: text("scope").notNull(), // "global" | "bot"
  scopeId: integer("scope_id"), // null for global, botId for bot scope
  key: text("key").notNull(), // e.g., "REPORT_FORMAT", "WRITING_TONE", "NO_EGRESS_PATHS"
  valueJson: jsonb("value_json").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("rule_memories_scope_key_unique").on(table.userId, table.scope, table.scopeId, table.key),
  index("idx_rule_memories_user_scope").on(table.userId, table.scope, table.scopeId),
]);

export const insertRuleMemorySchema = createInsertSchema(ruleMemories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RuleMemory = typeof ruleMemories.$inferSelect;
export type InsertRuleMemory = z.infer<typeof insertRuleMemorySchema>;
