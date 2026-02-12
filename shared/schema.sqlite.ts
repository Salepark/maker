import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex, index, primaryKey } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: text("sess", { mode: "json" }).notNull(),
  expire: integer("expire", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

export const presets = sqliteTable("presets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  outputType: text("output_type").notNull(),
  description: text("description"),
  variantsJson: text("variants_json", { mode: "json" }).notNull().default("[]"),
  defaultConfigJson: text("default_config_json", { mode: "json" }).notNull().default("{}"),
  icon: text("icon"),
  category: text("category"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  presetId: integer("preset_id").notNull().references(() => presets.id),
  name: text("name").notNull(),
  topic: text("topic").notNull(),
  variantKey: text("variant_key"),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  scheduleCron: text("schedule_cron").notNull().default("0 7 * * *"),
  configJson: text("config_json", { mode: "json" }).notNull().default("{}"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastRunAt: integer("last_run_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("rss"),
  url: text("url").notNull().unique(),
  topic: text("topic").notNull().default("ai_art"),
  trustLevel: text("trust_level").notNull().default("medium"),
  region: text("region").notNull().default("global"),
  rulesJson: text("rules_json", { mode: "json" }).notNull().default("{}"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const bots = sqliteTable("bots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  key: text("key").notNull(),
  name: text("name").notNull(),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  uniqueIndex("bots_user_key_unique").on(table.userId, table.key)
]);

export const llmProviders = sqliteTable("llm_providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  providerType: text("provider_type").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  baseUrl: text("base_url"),
  defaultModel: text("default_model"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const botSettings = sqliteTable("bot_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  botId: integer("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }).unique(),
  timezone: text("timezone").notNull().default("Asia/Seoul"),
  scheduleRule: text("schedule_rule").notNull().default("DAILY"),
  scheduleTimeLocal: text("schedule_time_local").notNull().default("07:00"),
  format: text("format").notNull().default("clean"),
  markdownLevel: text("markdown_level").notNull().default("minimal"),
  verbosity: text("verbosity").notNull().default("normal"),
  sectionsJson: text("sections_json", { mode: "json" }).notNull().default('{"tldr":true,"drivers":true,"risk":true,"checklist":true,"sources":true}'),
  filtersJson: text("filters_json", { mode: "json" }).notNull().default('{"minImportanceScore":0,"maxRiskLevel":100}'),
  llmProviderId: integer("llm_provider_id").references(() => llmProviders.id),
  modelOverride: text("model_override"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const sourceBotLinks = sqliteTable("source_bot_links", {
  sourceId: integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  botId: integer("bot_id").notNull().references(() => bots.id, { onDelete: "cascade" }),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  weight: integer("weight").notNull().default(3),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  primaryKey({ columns: [table.sourceId, table.botId] })
]);

export const profileSources = sqliteTable("profile_sources", {
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  sourceId: integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  weight: integer("weight").notNull().default(3),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  primaryKey({ columns: [table.profileId, table.sourceId] })
]);

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceId: integer("source_id").references(() => sources.id),
  topic: text("topic").notNull().default("ai_art"),
  externalId: text("external_id"),
  url: text("url").notNull().unique(),
  title: text("title"),
  author: text("author"),
  contentText: text("content_text").notNull(),
  tagsJson: text("tags_json", { mode: "json" }).notNull().default("[]"),
  status: text("status").notNull().default("new"),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  collectedAt: integer("collected_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
  insertedAt: integer("inserted_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const analysis = sqliteTable("analysis", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull().references(() => items.id).unique(),
  topic: text("topic").notNull().default("ai_art"),
  category: text("category").notNull(),
  relevanceScore: integer("relevance_score").notNull(),
  importanceScore: integer("importance_score").notNull().default(50),
  riskScore: integer("risk_score").notNull().default(0),
  replyWorthinessScore: integer("reply_worthiness_score").notNull(),
  linkFitScore: integer("link_fit_score").notNull(),
  riskFlagsJson: text("risk_flags_json", { mode: "json" }).notNull().default("[]"),
  recommendedAction: text("recommended_action").notNull(),
  suggestedAngle: text("suggested_angle").notNull().default(""),
  summaryShort: text("summary_short").notNull(),
  summaryLong: text("summary_long").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const drafts = sqliteTable("drafts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull().references(() => items.id),
  variant: text("variant").notNull(),
  draftText: text("draft_text").notNull(),
  includesLink: integer("includes_link", { mode: "boolean" }).notNull().default(false),
  linkType: text("link_type").notNull().default("none"),
  tone: text("tone").notNull().default("helpful"),
  adminDecision: text("admin_decision").notNull().default("pending"),
  finalText: text("final_text"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  draftId: integer("draft_id").notNull().references(() => drafts.id),
  postedAt: integer("posted_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
  resultJson: text("result_json", { mode: "json" }).notNull().default("{}"),
});

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").references(() => profiles.id),
  topic: text("topic").notNull().default("ai_art"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  itemsCount: integer("items_count").notNull().default(0),
  itemIdsJson: text("item_ids_json", { mode: "json" }).notNull().default("[]"),
  periodStart: integer("period_start", { mode: "timestamp_ms" }),
  periodEnd: integer("period_end", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const outputs = sqliteTable("outputs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => profiles.id),
  presetId: integer("preset_id").notNull().references(() => presets.id),
  topic: text("topic").notNull(),
  outputType: text("output_type").notNull(),
  title: text("title").notNull(),
  contentText: text("content_text").notNull(),
  reportStage: text("report_stage").notNull().default("full"),
  periodStart: integer("period_start", { mode: "timestamp_ms" }).notNull(),
  periodEnd: integer("period_end", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
}, (t) => [
  uniqueIndex("outputs_uq_profile_period").on(t.profileId, t.periodStart, t.periodEnd),
  index("outputs_idx_profile").on(t.profileId),
  index("outputs_idx_user").on(t.userId),
  index("outputs_idx_topic").on(t.topic),
]);

export const outputItems = sqliteTable("output_items", {
  outputId: integer("output_id").notNull().references(() => outputs.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
}, (t) => [
  primaryKey({ columns: [t.outputId, t.itemId] }),
  index("output_items_idx_output").on(t.outputId),
  index("output_items_idx_item").on(t.itemId),
]);

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const chatThreads = sqliteTable("chat_threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title"),
  activeBotId: integer("active_bot_id").references(() => bots.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadId: integer("thread_id").references(() => chatThreads.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  contentText: text("content_text").notNull(),
  kind: text("kind").default("text"),
  commandJson: text("command_json", { mode: "json" }),
  resultJson: text("result_json", { mode: "json" }),
  status: text("status").default("done"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
});

export const jobRuns = sqliteTable("job_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  botId: integer("bot_id").references(() => bots.id),
  botKey: text("bot_key").notNull(),
  jobType: text("job_type").notNull(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  durationMs: integer("duration_ms"),
  itemsCollected: integer("items_collected"),
  itemsAnalyzed: integer("items_analyzed"),
  outputId: integer("output_id"),
  reportStage: text("report_stage"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  errorDetailJson: text("error_detail_json", { mode: "json" }),
  metaJson: text("meta_json", { mode: "json" }),
}, (table) => [
  index("idx_job_runs_user_bot").on(table.userId, table.botId, table.startedAt),
  index("idx_job_runs_status").on(table.status, table.startedAt),
]);

export const permissions = sqliteTable("permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  scope: text("scope").notNull(),
  scopeId: integer("scope_id"),
  permissionKey: text("permission_key").notNull(),
  valueJson: text("value_json", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  uniqueIndex("permissions_scope_key_unique").on(table.userId, table.scope, table.scopeId, table.permissionKey),
  index("idx_permissions_user_scope").on(table.userId, table.scope, table.scopeId),
]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id),
  botId: integer("bot_id").references(() => bots.id),
  threadId: text("thread_id"),
  eventType: text("event_type").notNull(),
  permissionKey: text("permission_key"),
  payloadJson: text("payload_json", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => Date.now()),
}, (table) => [
  index("idx_audit_logs_user").on(table.userId, table.createdAt),
  index("idx_audit_logs_event").on(table.eventType, table.createdAt),
]);
