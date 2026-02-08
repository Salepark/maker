# Makelr Bot Manager

## Overview

Makelr is a workflow design tool for building personal automation bots. Users design their own workflows — choosing sources, schedules, and output formats — rather than consuming pre-built answers. The platform processes content from RSS feeds, uses AI for analysis, and generates customizable reports. It supports multi-user bot management, topic isolation, and preset templates as starting points (not answers).

**Product Philosophy (Phase 7):** "We don't provide bots. We provide tools for users to design their own automation workflows." Templates are starting points, not final solutions. Users own the workflow: sources, schedule, and output.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is a React 18 TypeScript single-page application using Wouter for routing, TanStack React Query for state management, shadcn/ui for UI components, and Tailwind CSS for styling. It features a multi-user profile system with dedicated pages for bot management, reports, sources, and settings, supporting light/dark theme toggling.

### Multi-User Bot Management
The system supports multiple user-defined bots, each associated with a specific topic (e.g., AI art, investing). Bots are created from presets via a Template Gallery with a guided wizard flow, allowing users to customize schedules, report sections, verbosity, markdown level, and content filters. This architecture includes dedicated database tables for bots, bot settings, and source linkages, ensuring strict topic isolation for data processing and report generation.

### Preset Gallery & Onboarding (Phase 4 + 4.0.1)
The system features a Preset Gallery with 8 templates across 6+ categories (Information, Business, Compliance, Research, Commerce, Engagement, Finance). Each preset includes `defaultConfigJson` with schedule, sections, format, default sources, and topic variants. Bot creation from presets is atomic (using DB transactions via `createBotFromPreset()` in storage). The wizard flow: Select Template → Choose Topic (if multi-topic) → Configure (name, sources) → Create. Pre-filled settings are fully customizable post-creation.

**Source Policy (Phase 4.0.1 — "Default is normal, details are user's"):**
- **Positioning**: The app is a "source management tool", NOT a "source recommendation service".
- **Default sources**: 3-7 well-known, non-controversial public channels per topic (e.g., Reuters, Hacker News, ArXiv, CNBC). All default sources are checked ON by default.
- **No Recommended/Optional split**: Removed in 4.0.1. All topic-matching default sources are shown equally.
- **Custom sources**: Users can add their own RSS URLs during wizard setup via "Add your own source" input. Custom sources are also persisted via the same `createBotFromPreset()` transaction.
- **Responsibility boundary**: "Default sources are widely used public channels. More specialized sources can be added by the user. Results from custom sources are the user's responsibility."
- **Source creation policy**: Reuse existing sources by URL; create new ones only if URL not found. Bot-source links are always created fresh per bot.

**Other Policies:**
- **Seed safety**: Presets have UNIQUE key constraint; seeds check by key, add new and update existing without duplication.
- **LLM selection priority**: Bot-specific LLM provider > System default (LLM_API_KEY env var) > Error with actionable Korean message ("Settings에서 AI Provider를 추가하세요").
- **Navigation**: Sidebar uses `/bots` route; `/profiles` is kept as alias for backward compatibility.

**Endpoints:**
- `GET /api/presets` — List all preset templates
- `POST /api/bots/from-preset` — Atomic bot creation (bot + settings + sources in one transaction). Accepts `customSources` array for user-added URLs.

**Phase 7-A v1.0 Presets (Safe Workflow Templates):**
Three additional safe workflow templates added with identical safety policy as Community Research Helper:
- `daily_market_brief_safe` — topic: market_brief, outputType: report, DAILY 09:00, 5 sources (Reuters, CNBC, Bloomberg, FT, WSJ)
- `academic_watcher_research` — topic: research_watch, outputType: report, WEEKDAYS 09:00, 5 sources (ArXiv, Google Research, OpenAI Blog, DeepMind, MIT Tech Review)
- `competitor_signal_monitor` — topic: competitor_watch, outputType: report, DAILY 09:00, 5 sources (TechCrunch, The Verge, Product Hunt, Hacker News, Ars Technica)
All enforce: requireHumanApproval=true, promotionLevel="none", linkPolicy="no-links". Icons: Briefcase, BookOpen, Building2.

**E2E coverage**: Login → browse gallery → create bot from preset → verify redirect → delete bot

### Backend
The backend is built with Node.js and TypeScript using Express.js, providing RESTful JSON APIs. It includes modules for database abstraction, scheduled background jobs (collect, analyze, draft), LLM integration, and business logic. Authentication is handled via Replit Auth with PostgreSQL for session storage, and all API routes are protected.

### Data Storage
PostgreSQL is used as the primary database, managed with Drizzle ORM. Key tables include `users`, `sessions`, `sources`, `items`, `analysis`, `drafts`, `outputs`, and `llm_providers`. A universal `outputs` table stores various generated content, linked to specific users and profiles.

### Bot-Profile Synchronization
When a bot is created from a preset (`POST /api/bots/from-preset`), a matching profile is automatically created and linked with the bot's sources. This ensures reports generated via Console or Reports page are saved to the `outputs` table (the single source of truth for the Reports page). If a bot exists without a profile (legacy data), the Console's `run_now report` command auto-creates a profile on demand.

### Background Jobs
Scheduled tasks, managed by node-cron, include:
- **Collect Job**: Fetches new items from RSS feeds.
- **Analyze Job**: Performs LLM-based analysis on collected items.
- **Draft Job**: Generates reply drafts for analyzed items.
- **Report Job**: Generates reports for profiles with due schedules, saved to the `outputs` table.

### LLM Integration
The system features a multi-provider LLM architecture, allowing users to "Bring Your Own LLM" (BYO LLM). It supports Anthropic, OpenAI, Google AI, and custom (OpenAI-compatible) providers. API keys are encrypted, and users can assign specific LLM providers and models to their bots. System-level jobs use a default LLM, while bot-specific operations can leverage user-configured providers. Prompts are topic-based, and outputs are structured JSON.

### AI Art Community Contribution Mode
For the 'ai_art' topic, the system enforces a strict "community contribution mode" to prevent promotional content. This involves LLM prompt instructions, server-side validation using regex checks to reject forbidden content (URLs, specific brand mentions, promotional phrases), and forcing `includesLink=false` for all AI art drafts.

### Command Chat (Phase 6 v1.0 + Phase 9 Pipeline)
A natural language interface, powered by Claude AI, allows users to control bots via chat commands. The system supports 9 bot-centric commands: `list_bots`, `switch_bot`, `bot_status`, `run_now`, `pause_bot`, `resume_bot`, `add_source`, `remove_source`, `pipeline_run`. Commands are parsed by LLM into a structured JSON schema `{type, botKey, args, confidence, needsConfirm, confirmText}`.

**Single-Command Pipeline (Phase 9):**
Users can execute the full pipeline (collect → analyze → report) with a single natural language command. The `pipeline_run` command type handles multi-step execution:
- Parses intent from natural language (Korean/English): "자료 수집하고 분석해서 아침 9시에 리포트 제출해"
- Executes sequentially: collect → analyze → report
- Optional schedule: If time is mentioned (e.g., "아침 9시"), saves schedule to bot settings and profile
- Step-by-step progress: Each step writes an interim message to the thread (polled by frontend at 2s during pipeline)
- User-friendly error messages with actionable suggestions (no technical jargon)
- `PipelineRunArgs`: `{ scheduleTimeLocal?: "HH:MM", scheduleRule?: "DAILY"|"WEEKDAYS"|"WEEKENDS", lookbackHours?, maxItems? }`

**Two-step execution flow (semi-automatic):**
- `POST /api/chat/threads` — Create a new chat thread
- `GET /api/chat/threads` — List user's threads
- `GET /api/chat/threads/:threadId/messages` — List messages in a thread
- `POST /api/chat/threads/:threadId/message` — Parses user input, returns confirm payload for data-changing commands
- `POST /api/chat/threads/:threadId/confirm` — Executes on approval; for `pipeline_run`, responds immediately and writes step messages asynchronously

**Active bot context:** Per-thread active bot stored in `chat_threads.activeBotId`. Commands without explicit botKey use the thread's active bot. UI shows active bot indicator at the top.

**Confirmation UX:** Data-modifying commands (run_now, pipeline_run, pause_bot, resume_bot, add_source, remove_source) show approve/cancel buttons. Read-only commands (list_bots, bot_status, switch_bot) execute immediately. confidence < 0.7 triggers a clarifying question instead of execution.

**Chat messages are user-scoped** (userId column) with `kind` field (`text`, `pending_command`, `command_result`) and status tracking (done, pending_confirm, confirmed, cancelled).

**Shared types:** `shared/chatCommand.ts` exports `ChatCommandType`, `ChatCommand`, `RunNowTarget`, `PipelineRunArgs`, `MessageKind` for frontend/backend consistency.

**File structure:**
- `shared/chatCommand.ts` — Shared command types (including `pipeline_run` and `PipelineRunArgs`)
- `server/llm/prompts_chat.ts` — LLM prompt templates for command parsing (with Korean pipeline detection rules)
- `server/chat/command-parser.ts` — Keyword detection (Korean + English) + LLM-based command parsing
- `server/chat/commandRouter.ts` — Command execution router (9 commands, including `execPipelineRun` with step callbacks)
- `server/chat/executor.ts` — Re-export shim for backward compatibility

**E2E coverage**: Login → browse gallery → create bot from preset → chat commands (list, switch, status) → verify active bot persistence → delete bot

### Landing Page (Phase 8)
Enhanced landing page with three additional sections:
- **Use Cases**: 6 concrete workflow examples (Market Brief, Research Tracker, Competitor Monitor, Community Research, Chat Control, BYO LLM)
- **FAQ Accordion**: 6 questions covering BYO LLM, sources, templates, scheduling, outputs, privacy
- **Bottom CTA**: Final call-to-action for sign-up

### New User Onboarding (Phase 8)
Dashboard shows a "Getting Started" card for users with 0 bots. Three steps:
1. Add AI Provider (shows "Done" badge when provider exists)
2. Create a Bot (links to template gallery)
3. View Reports (links to reports page)

### Report Export (Phase 8)
Reports page includes Copy (clipboard) and Download (Markdown .md file) buttons in the report viewer header. Only visible when a report is selected.

### Source Topics (Phase 8)
Expanded from 2 to 19 topic options in the source creation form: tech, investing, crypto, ai_art, creative, community_research, market_brief, research_watch, competitor_watch, finance, compliance, commerce, engagement, health, science, education, gaming, sustainability, other. Default topic is "tech".

### Console Prompt Hints (Phase 7.1)
State-aware autocomplete/hint system for the Console page. Instead of static example commands, the console now provides context-sensitive suggestions based on the user's current state.

**Console States (S0-S4):**
- S0: No bot selected → hints to list/select bots
- S1: Bot exists but no sources → hints to add sources
- S2: Sources exist but no recent collection → hints to run pipeline
- S3: Ready (all set) → full range of hints (schedule, filter, output style, safety)
- S4: Schedule/config issue → diagnostic hints

**Backend:** `GET /api/console/context?threadId=X` returns bot state (botCount, activeBotId, sourceCount, lastCollectedAt, scheduleRule, scheduleTimeLocal, isEnabled, hasLlmProvider, hasUserProviders).

**Frontend components:**
- OnboardingView: Shown when chat is empty, displays state-appropriate hint chips
- HintDropdown: Appears on input focus (empty input), grouped by 6 categories
- HintChip: Clickable suggestions that insert text into input (no auto-execute)
- Right sidebar: State-aware suggestions replacing static example commands
- Next-action hints: Contextual follow-up suggestions after command results
- Dynamic placeholder: Changes based on console state

**6 Hint Categories:** First Run, Schedule, One-time Run, Focus Area, Output Style, Safety (30+ hints total, Korean language)

## External Dependencies

### Environment Variables
- `DATABASE_URL`
- `LLM_API_KEY`
- `SESSION_SECRET`
- `CLAUDE_MODEL` (Optional)
- `APP_BASE_URL`

### Third-Party Services
- **Anthropic Claude API**: For AI content analysis and draft generation.
- **PostgreSQL**: Primary database.
- **RSS Feeds**: External content sources.
- **Replit Auth**: Authentication provider.

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`
- `rss-parser`
- `node-cron`
- `express-session`, `connect-pg-simple`
- `@tanstack/react-query`
- `wouter`