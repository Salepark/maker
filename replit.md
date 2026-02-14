# Maker Bot Manager

## Overview

Maker is a workflow design tool that empowers users to create personal automation bots. It enables users to design custom workflows by selecting content sources (like RSS feeds), defining schedules, and specifying output formats. The platform processes content, utilizes AI for analysis, and generates customizable reports. Key features include multi-user bot management with strict topic isolation, preset templates for easy workflow creation, and the ability for users to "Bring Your Own LLM" for AI tasks. The project aims to provide a flexible platform for personalized automation rather than offering pre-built solutions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
A React 18 TypeScript single-page application built with Wouter for routing, TanStack React Query for state management, shadcn/ui for UI components, and Tailwind CSS for styling. It features a multi-user interface with dedicated pages for bot management, reports, sources, and settings, including light/dark theme support.

### Multi-User Bot Management
The system supports multiple user-defined bots, each focused on a specific topic. Bots can be created from a Template Gallery via a guided wizard, allowing customization of schedules, report sections, verbosity, markdown level, and content filters. This design ensures topic isolation.

### Preset Gallery & Onboarding
A Preset Gallery offers various templates across multiple categories, each with a default configuration. A wizard guides users through template selection, topic choice, and initial configuration. All settings are fully customizable post-creation.

### Backend
The backend is a Node.js and TypeScript application using Express.js, providing RESTful JSON APIs. It manages database interactions, scheduled background jobs, LLM integration, and business logic.

### Data Storage
PostgreSQL serves as the primary database, managed with Drizzle ORM, storing user data, sessions, sources, collected items, analysis results, drafts, and generated outputs. The system also supports SQLite for local/desktop deployments.

### Background Jobs
Scheduled tasks, managed by `node-cron`, handle content collection from RSS feeds, AI-based analysis of collected content, draft generation, and report generation.

### LLM Integration
A multi-provider LLM architecture allows users to integrate their own LLMs (e.g., Anthropic, OpenAI, Google AI, or custom OpenAI-compatible endpoints). API keys are encrypted, and users can assign specific LLM providers and models to their bots. Prompts are topic-based, and outputs are structured JSON.

### Command Chat
A natural language interface, powered by Claude AI, enables users to control bots via chat commands for tasks such as listing, switching, checking status, running, pausing, resuming bots, and managing sources.

### Report Generation & Pipeline
The system implements a multi-stage report pipeline designed for efficiency and cost optimization:
- **Fast Report**: Instant, no LLM involvement, shows collected item previews.
- **Status Report**: LLM-powered fallback for timeouts, showing partial analysis.
- **Full Report**: Asynchronous, LLM-powered, providing comprehensive AI analysis.
This pipeline ensures immediate feedback and background processing for detailed reports, with built-in timeouts and graceful fallbacks.

### Internationalization (i18n)
The application supports English and Korean using a homegrown i18n system. Language preferences are persisted, and all UI text is localized.

### Multi-DB Architecture
Supports both PostgreSQL (default for cloud deployment) and SQLite (for local desktop deployment) based on environment variables, with schema mirroring and driver abstraction.

### Electron Desktop Packaging
The application is set up for desktop distribution using Electron, allowing the Express server to run locally with SQLite, and opening a BrowserWindow for the UI. SQLite data path: `app.getPath('userData')/maker.db` (Mac: `~/Library/Application Support/Maker/maker.db`, Win: `%AppData%/Maker/maker.db`). Auth in desktop mode uses auto-login with memorystore sessions (no OIDC). Desktop detection: `window.electronAPI` or `window.maker` exposed via preload.

#### Local Mode Gating
`isLocalMode = driver === "sqlite" && (NODE_ENV === "development" || MAKER_DESKTOP === "true")`. Electron's `main.ts` always sets `MAKER_DESKTOP=true` in the server process env. `isDev` in Electron uses `app.isPackaged` for reliable dev/prod detection.

#### Local Dev Commands
- `MAKER_DB=sqlite npm run dev` — Run server in SQLite mode (browser at http://localhost:5000)
- `npm run dev:desktop` — Launch Electron desktop app (cross-env + tsx/register, works on all OS)

#### Desktop Build & Package
- `npm run build:desktop` — Bundle client+server+electron via `script/build-desktop.ts`
- `npm run pack:desktop` — Package into .app/.exe/.AppImage via electron-builder
- Config: `electron/electron-builder.yml` with `asarUnpack` for `better-sqlite3` native module
- Output: `dist-electron/` directory
- Full local setup guide: `LOCAL_SETUP.md`

#### Desktop npm Scripts (in package.json)
- `dev:desktop`: `cross-env MAKER_DB=sqlite MAKER_DESKTOP=true NODE_ENV=development electron -r tsx/register electron/main.ts`
- `build:desktop`: `tsx script/build-desktop.ts`
- `pack:desktop`: `electron-builder --config electron/electron-builder.yml`
- Uses `cross-env` for Windows/Mac/Linux compatibility, `-r tsx/register` for TypeScript support in Electron

### Job Run Logging & Diagnostics
The system includes infrastructure for tracking job executions in a `job_runs` table, providing detailed diagnostics and execution history for each bot. This includes API endpoints for checking bot health, last runs, and comprehensive diagnostics. The Daily Reliability card on the Dashboard shows 7-day success rate, average generation time, last run, and last failure reason via `GET /api/diagnostics/daily-loop`.

### Report Pipeline Reliability (Phase X)
- **Timeout Hardening**: Server-side 25s timeout on report generation API, client-side 12s stall toast, 30s absolute client cutoff via AbortController. Background upgrades have 55s timeout with full job_run logging.
- **Fast Report Template**: Standardized format with title, collection summary, top 10 items, keyword summary (top 5 extracted via bilingual tokenizer), and source distribution.
- **Memory Layer v0.1**: `report_metrics` table stores per-report `itemCount`, `keywordSummary` (JSON), and `sourceDistribution` (JSON). Trends API (`GET /api/reports/:profileId/trends`) computes trending keywords, recurring keywords (4+ day appearances), and source shifts.
- **Trend Block**: Full reports automatically append a "7일 변화 요약" section showing keyword change percentages, recurring keywords, and source distribution shifts.

### Permission System v1.0
A comprehensive permission and policy system controlling bot capabilities:
- **Schema**: `permissions` table (userId, scope global/bot, scopeId, permissionKey, valueJson) and `audit_logs` table for security event tracking. Both PG and SQLite schemas.
- **Policy Engine** (`server/policy/`): `types.ts` defines 13 permission keys across 6 groups (web_sources, ai_data, files, calendar, scheduling, memory). `engine.ts` provides `getEffectivePermissions` (merge default → global → bot override), `checkPermission`, `checkEgress` (3-level LLM data control: NO_EGRESS < METADATA_ONLY < FULL_CONTENT_ALLOWED), and `logPermissionAction`.
- **ApprovalMode**: AUTO_ALLOWED, APPROVAL_REQUIRED, AUTO_DENIED.
- **Defaults**: WEB_RSS = AUTO_ALLOWED (ON), SOURCE_WRITE/SCHEDULE_WRITE/LLM_USE = APPROVAL_REQUIRED (ON), WEB_FETCH = APPROVAL_REQUIRED (OFF), FS_READ/FS_WRITE/CAL_READ/CAL_WRITE = APPROVAL_REQUIRED (OFF), FS_DELETE = AUTO_DENIED (OFF), LLM egress = METADATA_ONLY.
- **API Routes**: GET/PUT/DELETE `/api/permissions`, GET `/api/permissions/effective`, POST `/api/permissions/check`, POST `/api/permissions/approve-once`, GET `/api/audit-logs`.
- **Integration**: Policy checks enforced on RSS collect, LLM analyze (with egress level validation), and source management (create/update/delete) routes, with audit logging on denials.
- **Permission Request UX**: When APPROVAL_REQUIRED is triggered, the API returns structured 403 with `requiresApproval: true` and bilingual message templates (title/why/impact/risk). Frontend shows a `PermissionRequestModal` with scope selection (once/bot/global). One-time approvals use an in-memory allowlist with 60s TTL. Bot/global approvals persist via the permissions API.
- **UI**: Dedicated `/permissions` page with global defaults management (group cards, switches, approval mode selects, egress level control) and audit log tab. Bot-level Permission Dashboard card in bot detail page with summary bar, 4 groups, risk badges, detail modal, and recent audit history.
- **Platform-Aware Filtering**: Permissions are filtered by platform (web vs desktop/Electron). On web: FS_READ, FS_WRITE, FS_DELETE, CAL_READ, CAL_WRITE are hidden (localOnly). LLM_EGRESS_LEVEL hides FULL_CONTENT_ALLOWED on web. On desktop: all permissions shown with "Local Only" badges on desktop-specific items. Detection via `window.electronAPI`.
- **i18n**: Full EN/KR translations for all permission, audit log, and approval UI strings.

### Long-Term Memory System (Phase 1: Rule Memory)
A 3-layer memory architecture for persistent user preferences and knowledge:
- **Rule Memory** (implemented): `rule_memories` table (userId, scope global/bot, scopeId, key, valueJson) for user preferences like report tone, summary length, exclusion keywords, focus topics. Both PG and SQLite schemas mirrored.
- **Storage CRUD**: `listRuleMemories`, `listAllUserRuleMemories`, `upsertRuleMemory`, `deleteRuleMemory`, `getEffectiveRules` (merges global → bot override).
- **API Routes**: GET `/api/memory/rules` (with scope/scopeId query params, scope=all for all rules), GET `/api/memory/rules/effective` (merged rules for a bot), PUT `/api/memory/rules` (upsert), DELETE `/api/memory/rules`.
- **Permission Keys**: `MEMORY_WRITE` (AUTO_ALLOWED, LOW risk), `DATA_RETENTION` (APPROVAL_REQUIRED, MED risk) in `memory` group. Policy engine extended with these keys.
- **Report Pipeline Integration**: `buildDailyBriefPrompt` accepts optional `userRules` parameter. Report job fetches effective rules via `getEffectiveRules(userId, botId)` and injects them as "User Rules & Preferences" block in the LLM prompt.
- **UI**: `MemoryCard` component in bot detail page showing bot + global rules, add/edit/delete UI with preset key selection (REPORT_TONE, SUMMARY_LENGTH, LANGUAGE_PREF, EXCLUDE_KEYWORDS, FOCUS_TOPICS, CUSTOM), scope toggle (bot/global), and expandable "Effective Rules" panel.
- **i18n**: Full EN/KR translations for all memory UI strings.
- **Planned Phases**: Phase 2 (Knowledge Memory - text search index over collected data), Phase 3 (advanced features - retention policies, embeddings, NL commands).

## External Dependencies

### Environment Variables
- `DATABASE_URL` (for PostgreSQL)
- `MAKER_DB` (`sqlite` for local mode)
- `MAKER_SQLITE_PATH` (custom SQLite path)
- `LLM_API_KEY`
- `SESSION_SECRET`
- `CLAUDE_MODEL`
- `APP_BASE_URL`

### Third-Party Services
- Anthropic Claude API
- PostgreSQL
- SQLite
- RSS Feeds
- Replit Auth

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`
- `better-sqlite3`
- `rss-parser`
- `node-cron`
- `express-session`, `connect-pg-simple`
- `@tanstack/react-query`
- `wouter`

## Internal Documents
- `docs/PHILOSOPHY_EN.md` — Maker 사업 철학 영문 공개 문서