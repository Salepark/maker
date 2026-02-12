# Makelr Bot Manager

## Overview

Makelr is a workflow design tool for building personal automation bots. It enables users to design their own workflows by choosing content sources, defining schedules, and specifying output formats. The platform processes content from RSS feeds, leverages AI for analysis, and generates customizable reports. It supports multi-user bot management, strict topic isolation, and offers preset templates as starting points for workflow creation. The core philosophy is to empower users to design their own automation rather than providing pre-built solutions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is a React 18 TypeScript single-page application utilizing Wouter for routing, TanStack React Query for state management, shadcn/ui for UI components, and Tailwind CSS for styling. It provides a multi-user interface with dedicated pages for bot management, reports, sources, and settings, including light/dark theme support.

### Multi-User Bot Management
The system supports multiple user-defined bots, each focused on a specific topic. Bots can be created from a Template Gallery via a guided wizard, allowing customization of schedules, report sections, verbosity, markdown level, and content filters. This includes dedicated database tables for bots and their settings, ensuring topic isolation.

### Preset Gallery & Onboarding
The system features a Preset Gallery with various templates across multiple categories. Each preset includes a default configuration for schedule, sections, format, and sources. Bot creation from presets is an atomic operation, ensuring data consistency. The wizard guides users through template selection, topic choice, and initial configuration, with all settings being fully customizable post-creation. Default sources are well-known public channels, and users can add custom RSS URLs.

### Backend
The backend is built with Node.js and TypeScript using Express.js, offering RESTful JSON APIs. It handles database interactions, scheduled background jobs, LLM integration, and business logic. Authentication uses Replit Auth with PostgreSQL for session management, and all API routes are protected.

### Data Storage
PostgreSQL serves as the primary database, managed with Drizzle ORM. It stores user data, sessions, sources, collected items, analysis results, drafts, and generated outputs. A universal `outputs` table stores all generated content, linked to specific users and profiles.

### Bot-Profile Synchronization
When a bot is created from a preset, a corresponding profile is automatically generated and linked to the bot's sources, ensuring consistency in report generation and storage.

### Background Jobs
Scheduled tasks, managed by `node-cron`, include:
- **Collect Job**: Fetches new content from RSS feeds.
- **Analyze Job**: Performs AI-based analysis on collected content.
- **Draft Job**: Generates reply drafts.
- **Report Job**: Generates reports for scheduled profiles.

### LLM Integration
The system supports a multi-provider LLM architecture, allowing users to "Bring Your Own LLM" (BYO LLM) from providers like Anthropic, OpenAI, and Google AI, or custom OpenAI-compatible endpoints. API keys are encrypted, and users can assign specific LLM providers and models to their bots. Prompts are topic-based, and outputs are structured JSON. A strict "community contribution mode" is enforced for specific topics like 'ai_art' to prevent promotional content.

### Command Chat
A natural language interface, powered by Claude AI, enables users to control bots via chat commands. It supports commands for listing, switching, checking status, running, pausing, resuming bots, and managing sources. The system can parse natural language commands into structured JSON and supports a single-command pipeline to execute collect, analyze, and report steps sequentially, with optional scheduling. Command execution involves a confirmation step for data-modifying actions.

### Landing Page & Onboarding
The landing page includes sections for use cases, FAQs, and a call-to-action. New users are guided with a "Getting Started" card on the dashboard, prompting them to add an AI provider, create a bot, and view reports.

### Report Export
Reports can be copied to the clipboard or downloaded as Markdown (.md) files from the report viewer.

### Source Topics
An expanded list of 19 topic options is available for source creation.

### Online Business Market Research Assistant (Phase 10)
Preset `online_business_research` — topic: online_business, outputType: report, DAILY 09:00, 8 Korean market sources (네이버 쇼핑 인사이트, 네이버 카페 스마트스토어, 네이버 블로그 후기, 쿠팡, 당근마켓, 브런치/Medium, Reddit 글로벌 비교, 공정거래위원회/소비자원). Enforces: requireHumanApproval=true, promotionLevel="none", linkPolicy="no-links". Icon: Store. Category: business. TOPIC_META: role="market research analyst specializing in e-commerce", focus on customer hesitation signals. sourceDisclaimer field added to PresetDefaultConfig — displayed in wizard when present. Landing page use case added.

### Korea Marketplace Research Assistant (Phase 10 derivative)
Preset `korea_marketplace_research` — topic: korea_marketplace, outputType: report, DAILY 09:00, 7 sources (네이버 카페 스마트스토어, 네이버 카페 셀러/창업, Reddit r/ecommerce, 네이버 스마트스토어 공식 블로그, 쿠팡 뉴스룸, Google Trends Korea, 통계청 KOSIS). Enforces same safety policy. Icon: ShoppingCart. Category: commerce. TOPIC_META: role="market research analyst specializing in Korean open marketplaces (Coupang, Naver SmartStore)". Report sections: marketSnapshot, customerSignals, sellerSignals, riskFlags, opportunityHints, actionItems, draftNotes. sourceDisclaimer in Korean. Landing page use case added.

### LLM Optimization & Report Pipeline
The system implements a multi-stage report pipeline to minimize LLM costs and provide instant user feedback:
- **Fast Report** (instant, no LLM): Generated immediately on schedule or manual trigger. Shows collected item preview and source statistics.
- **Status Report** (LLM-powered fallback): Generated when full analysis times out. Shows partial analysis results.
- **Full Report** (LLM-powered, background): Generated asynchronously after Fast Report. Includes full AI analysis.
- `callLLMWithTimeout` wrapper in `server/llm/client.ts` enforces 60s timeout for reports, 30s for analysis, with graceful fallback.
- `shouldAnalyzeItem` policy function in `server/jobs/analyze_items.ts` skips items with text < 50 chars (MIN_TEXT_LENGTH), reducing unnecessary LLM calls.
- Background upgrade flow: `generateFastReport` → `scheduleBackgroundUpgrade` (2s delay) → inline analysis → upgrade to full stage.
- UI auto-refreshes every 10s when fast reports exist, showing color-coded stage badges (초기 브리핑 / 상태 리포트 / 확장 리포트).
- Unified user messaging: "메이커는 먼저 빠른 브리핑을 제공합니다. 심화 분석은 백그라운드에서 진행되며, 완료되면 자동으로 업데이트됩니다."

### Console Prompt Hints
The Console provides context-sensitive autocomplete and hints based on the user's current state (e.g., no bot selected, no sources, ready state), offering suggestions for next actions and diagnostics.

### Bilingual Support (i18n)
The application supports English and Korean via a homegrown i18n system (no react-i18next dependency). Key files:
- `client/src/lib/language-provider.tsx`: `LanguageProvider` context + `useLanguage()` hook returning `{ language, setLanguage, t }`. The `t(key, params?)` function looks up flat translation keys with `{{param}}` interpolation.
- `client/src/i18n/en.ts` and `client/src/i18n/ko.ts`: ~410 flat translation keys covering all pages (sidebar, landing, dashboard, reports, chat, settings, sources, profiles, bot-detail).
- `client/src/i18n/index.ts`: Exports `Language` type and `translations` map.
- `client/src/components/language-switcher.tsx`: Globe icon toggle button (EN/KO) in the header.
- Language preference persisted in `localStorage("language")`.
- All pages import `useLanguage` and call `t("key")` instead of hardcoding strings.
- Fallback: if a key is missing in the active language, it falls back to English, then returns the raw key.

### Multi-DB Architecture (Local-first)
The system supports two database drivers selectable via `MAKER_DB` env var:
- **PostgreSQL** (default, `MAKER_DB` unset or `pg`): Cloud/server deployment, uses `DATABASE_URL`.
- **SQLite** (`MAKER_DB=sqlite`): Local desktop deployment, uses WAL journaling + foreign keys. Path: `MAKER_SQLITE_PATH` or `./data/maker.sqlite`.
- Key files: `server/db.ts` (driver factory), `shared/schema.sqlite.ts` (SQLite schema mirroring 16 tables), `server/storage-sqlite.ts` (SqliteStorage class, 60+ IStorage methods), `server/init-sqlite.ts` (table creation), `server/seed.ts` (DB-agnostic seeding).
- Type differences: integer timestamps vs pg timestamp, text(mode:"json") vs jsonb, integer boolean vs native boolean, integer autoincrement vs serial.

### Electron Desktop Packaging (Phase A)
Files in `electron/` directory prepare the app for desktop distribution:
- `electron/main.ts`: Main process — spawns Express server with `MAKER_DB=sqlite`, waits for health check, opens BrowserWindow.
- `electron/preload.ts`: Secure contextBridge exposing `window.makelr` (platform, versions).
- `electron/electron-builder.yml`: Build config for Mac/Win/Linux targets.
- `/api/health` endpoint (unauthenticated): Returns `{ status, timestamp, driver }` for Electron health polling.

### Graceful Error Handling (SQLite MVP)
- `server/lib/safe-storage.ts`: Exports `NotImplementedError` class and `handleApiError(res, error, fallbackMsg)` utility.
- All 46 simple route catch blocks in `server/routes.ts` use `handleApiError` which detects `NotImplementedError` and returns 501 with user-friendly bilingual message instead of generic 500.
- `safeStorageCall(fallback, label, fn)` utility for jobs: catches `NotImplementedError` and returns a safe fallback value instead of crashing.
- IStorage additions: `addSourceToBot(botId, userId, sourceId, weight?)`, `removeSourceFromBot(botId, userId, sourceId)`, `findItemByDedupeKey(sourceId, url)` — implemented in both DatabaseStorage and SqliteStorage.

### Report Pipeline Reliability (Phase C)
`generateReportForProfile` (manual "run now" path) now uses fast-first approach identical to the scheduled path:
1. Instantly generates a fast report (no LLM blocking)
2. Schedules background LLM upgrade asynchronously
3. UI auto-refreshes to show upgraded report when ready
This eliminates the previous 60s blocking behavior on manual report generation.

### Pipeline Reliability ("running... 근절 패키지")
Three-layer timeout cascade eliminates infinite "running..." waits:
- **Server hard timeout (25s)**: `withTimeout` wrapper on `execPipelineRunInner`; if exceeded, sends "timeout" step message and returns graceful response with background upgrade continuing.
- **Client stall detection (12s)**: Monitors last pipeline message timestamp; if no new messages for 12s, auto-terminates with toast notification.
- **Client hard timeout (30s)**: Absolute fallback; terminates pipeline indicator with bilingual toast.
- **Immediate feedback**: Pipeline emits "start" step message instantly before any async work begins. Schedule saves happen first (sub-second), then collect, then report.
- **Step-by-step progress**: Each pipeline phase (start → schedule → collect → report) emits a bilingual progress message saved to DB and shown in UI.
- **Elapsed timer**: Pipeline indicator shows running seconds counter.
- **Bilingual progress text**: `getPipelineProgressLabel` supports EN/KO.
- Step types: `"start" | "collect" | "analyze" | "report" | "schedule" | "timeout"`.

## External Dependencies

### Environment Variables
- `DATABASE_URL` (PostgreSQL mode)
- `MAKER_DB` (optional: `sqlite` for local mode)
- `MAKER_SQLITE_PATH` (optional: custom SQLite file path)
- `LLM_API_KEY`
- `SESSION_SECRET`
- `CLAUDE_MODEL`
- `APP_BASE_URL`

### Third-Party Services
- **Anthropic Claude API**: For AI content analysis and draft generation.
- **PostgreSQL**: Primary database (cloud mode).
- **SQLite**: Local database (desktop mode).
- **RSS Feeds**: External content sources.
- **Replit Auth**: Authentication provider (cloud mode).

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`
- `better-sqlite3` (SQLite driver)
- `rss-parser`
- `node-cron`
- `express-session`, `connect-pg-simple`
- `@tanstack/react-query`
- `wouter`