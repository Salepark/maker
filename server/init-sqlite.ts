import { sqliteRaw } from "./db";
import * as schema from "../shared/schema.sqlite";

export function initSqliteTables() {
  if (!sqliteRaw) return;

  const raw = sqliteRaw;

  raw.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      output_type TEXT NOT NULL,
      description TEXT,
      variants_json TEXT NOT NULL DEFAULT '[]',
      default_config_json TEXT NOT NULL DEFAULT '{}',
      icon TEXT,
      category TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      preset_id INTEGER NOT NULL REFERENCES presets(id),
      name TEXT NOT NULL,
      topic TEXT NOT NULL,
      variant_key TEXT,
      timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
      schedule_cron TEXT NOT NULL DEFAULT '0 7 * * *',
      config_json TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_run_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'rss',
      url TEXT NOT NULL UNIQUE,
      topic TEXT NOT NULL DEFAULT 'ai_art',
      trust_level TEXT NOT NULL DEFAULT 'medium',
      region TEXT NOT NULL DEFAULT 'global',
      rules_json TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS bots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS bots_user_key_unique ON bots(user_id, key);

    CREATE TABLE IF NOT EXISTS llm_providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      provider_type TEXT NOT NULL,
      api_key_encrypted TEXT NOT NULL,
      base_url TEXT,
      default_model TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS bot_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id INTEGER NOT NULL UNIQUE REFERENCES bots(id) ON DELETE CASCADE,
      timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
      schedule_rule TEXT NOT NULL DEFAULT 'DAILY',
      schedule_time_local TEXT NOT NULL DEFAULT '07:00',
      format TEXT NOT NULL DEFAULT 'clean',
      markdown_level TEXT NOT NULL DEFAULT 'minimal',
      verbosity TEXT NOT NULL DEFAULT 'normal',
      sections_json TEXT NOT NULL DEFAULT '{"tldr":true,"drivers":true,"risk":true,"checklist":true,"sources":true}',
      filters_json TEXT NOT NULL DEFAULT '{"minImportanceScore":0,"maxRiskLevel":100}',
      llm_provider_id INTEGER REFERENCES llm_providers(id),
      model_override TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS source_bot_links (
      source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      weight INTEGER NOT NULL DEFAULT 3,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      PRIMARY KEY (source_id, bot_id)
    );

    CREATE TABLE IF NOT EXISTS profile_sources (
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      weight INTEGER NOT NULL DEFAULT 3,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      PRIMARY KEY (profile_id, source_id)
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER REFERENCES sources(id),
      topic TEXT NOT NULL DEFAULT 'ai_art',
      external_id TEXT,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      author TEXT,
      content_text TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'new',
      published_at INTEGER,
      collected_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      inserted_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL UNIQUE REFERENCES items(id),
      topic TEXT NOT NULL DEFAULT 'ai_art',
      category TEXT NOT NULL,
      relevance_score INTEGER NOT NULL,
      importance_score INTEGER NOT NULL DEFAULT 50,
      risk_score INTEGER NOT NULL DEFAULT 0,
      reply_worthiness_score INTEGER NOT NULL,
      link_fit_score INTEGER NOT NULL,
      risk_flags_json TEXT NOT NULL DEFAULT '[]',
      recommended_action TEXT NOT NULL,
      suggested_angle TEXT NOT NULL DEFAULT '',
      summary_short TEXT NOT NULL,
      summary_long TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id),
      variant TEXT NOT NULL,
      draft_text TEXT NOT NULL,
      includes_link INTEGER NOT NULL DEFAULT 0,
      link_type TEXT NOT NULL DEFAULT 'none',
      tone TEXT NOT NULL DEFAULT 'helpful',
      admin_decision TEXT NOT NULL DEFAULT 'pending',
      final_text TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL REFERENCES drafts(id),
      posted_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      result_json TEXT NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER REFERENCES profiles(id),
      topic TEXT NOT NULL DEFAULT 'ai_art',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      items_count INTEGER NOT NULL DEFAULT 0,
      item_ids_json TEXT NOT NULL DEFAULT '[]',
      period_start INTEGER,
      period_end INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      profile_id INTEGER NOT NULL REFERENCES profiles(id),
      preset_id INTEGER NOT NULL REFERENCES presets(id),
      topic TEXT NOT NULL,
      output_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content_text TEXT NOT NULL,
      report_stage TEXT NOT NULL DEFAULT 'full',
      period_start INTEGER NOT NULL,
      period_end INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS outputs_uq_profile_period ON outputs(profile_id, period_start, period_end);
    CREATE INDEX IF NOT EXISTS outputs_idx_profile ON outputs(profile_id);
    CREATE INDEX IF NOT EXISTS outputs_idx_user ON outputs(user_id);
    CREATE INDEX IF NOT EXISTS outputs_idx_topic ON outputs(topic);

    CREATE TABLE IF NOT EXISTS output_items (
      output_id INTEGER NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      PRIMARY KEY (output_id, item_id)
    );
    CREATE INDEX IF NOT EXISTS output_items_idx_output ON output_items(output_id);
    CREATE INDEX IF NOT EXISTS output_items_idx_item ON output_items(item_id);

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS chat_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT,
      active_bot_id INTEGER REFERENCES bots(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER REFERENCES chat_threads(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL,
      content_text TEXT NOT NULL,
      kind TEXT DEFAULT 'text',
      command_json TEXT,
      result_json TEXT,
      status TEXT DEFAULT 'done',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS job_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      bot_id INTEGER REFERENCES bots(id),
      bot_key TEXT NOT NULL,
      job_type TEXT NOT NULL,
      trigger TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      finished_at INTEGER,
      duration_ms INTEGER,
      items_collected INTEGER,
      items_analyzed INTEGER,
      output_id INTEGER,
      report_stage TEXT,
      error_code TEXT,
      error_message TEXT,
      error_detail_json TEXT DEFAULT '{}',
      meta_json TEXT DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_job_runs_user_bot ON job_runs(user_id, bot_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_job_runs_status ON job_runs(status, started_at);

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      scope TEXT NOT NULL,
      scope_id INTEGER,
      permission_key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS permissions_scope_key_unique ON permissions(user_id, scope, scope_id, permission_key);
    CREATE INDEX IF NOT EXISTS idx_permissions_user_scope ON permissions(user_id, scope, scope_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id),
      bot_id INTEGER REFERENCES bots(id),
      thread_id TEXT,
      event_type TEXT NOT NULL,
      permission_key TEXT,
      payload_json TEXT DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type, created_at);

    CREATE TABLE IF NOT EXISTS report_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id INTEGER NOT NULL,
      profile_id INTEGER NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      keyword_summary TEXT NOT NULL DEFAULT '{}',
      source_distribution TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );
    CREATE INDEX IF NOT EXISTS idx_report_metrics_profile ON report_metrics(profile_id, created_at);
  `);

  console.log("[SQLite] All tables created successfully");
}
