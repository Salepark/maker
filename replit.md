# Makelr Bot Manager

## Overview

This is an AI-powered content monitoring and community engagement bot for AI art marketplaces. The system collects content from RSS feeds, analyzes posts using Claude AI to determine relevance and reply-worthiness, generates draft responses, and provides an admin dashboard for human review and approval before posting.

The application follows a three-stage pipeline:
1. **Collect** - Scrape RSS feeds from configured sources
2. **Analyze** - Use LLM to score relevance, categorize content, and identify risks
3. **Draft** - Generate contextual reply drafts with optional promotional links

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with HMR support

The frontend is a single-page application with pages for Dashboard, My Bots (Profiles), Items, Drafts, Observe, Reports, Sources, Settings, and Chat. Theme switching (light/dark) is supported via CSS custom properties.

### Multi-User Profile System (Phase 1 + Phase 2)

The application now supports multi-user bot management with profile-based report generation:

**Core Concepts:**
- **Topic**: Data separation layer (ai_art, investing, tech, crypto) - each source and profile is tied to a topic
- **Preset**: Bot template defining default configuration and variants (daily_market_brief, community_engagement_helper, competitor_watch)
- **Profile**: User's personalized bot instance created from a preset
- **Variant**: Sub-type within a preset (e.g., crypto vs equity for daily_market_brief)

**Database Tables:**
- `presets` - Bot templates with default configs
- `profiles` - User-specific bot instances with custom settings (includes lastRunAt for scheduler)
- `profile_sources` - Many-to-many linking profiles to sources
- `output_items` - Links reports to the items they were generated from

**Step 8-1: New Bot Management Tables (병행 운영)**
- `bots` - User's bot instances (userId, key, name, isEnabled)
  - Unique constraint on (userId, key) to prevent duplicate bots per user
- `bot_settings` - Bot settings 1:1 (botId unique FK)
  - timezone, scheduleRule (DAILY/WEEKDAYS/WEEKENDS), scheduleTimeLocal
  - format, markdownLevel (minimal/normal), verbosity (short/normal/detailed)
  - sectionsJson: { tldr, drivers, risk, checklist, sources }
  - filtersJson: { minImportanceScore, maxRiskLevel }
- `source_bot_links` - Source ↔ Bot connection
  - sourceId, botId (composite PK), isEnabled, weight (1-5)

**Storage Functions (Step 8-1):**
- `listBots(userId)` - Get all bots for a user with settings
- `getBot(id, userId)` - Get single bot with settings
- `createBot(data)` - Create new bot
- `updateBot(id, userId, patch)` - Update bot
- `deleteBot(id, userId)` - Delete bot
- `getBotSettings(botId)` - Get bot's settings
- `createBotSettings(data)` - Create settings for bot
- `updateBotSettings(botId, patch)` - Update settings
- `getBotSources(botId)` - Get sources linked to bot
- `setBotSources(botId, userId, sourceData)` - Set bot's sources
- `ensureDefaultBots(userId)` - Create default ai_art and investing bots on first login

**Phase 2: Profile-Based Report Generation**
- Reports are now generated per-profile with strict topic isolation
- Topic mixing prevention: items.topic must match profile.topic
- Source filtering: only items from profile's linked sources are included
- Security: All report endpoints verify user ownership before access/generation

**Step 8: User Customization Layer**
- **ProfileConfig Type** (defined in `shared/schema.ts`): Stored in `profiles.configJson`
  - `scheduleRule`: "DAILY" | "WEEKDAYS" | "WEEKENDS" - controls which days the bot runs
  - `sections`: Toggle individual report sections (tldr, drivers, risk, checklist, sources)
  - `verbosity`: "short" | "normal" | "detailed" - controls report length
  - `markdownLevel`: "minimal" | "normal" - controls markdown formatting
  - `filters.minImportanceScore`: Filter out items below this threshold
- **Profile Detail UI**: Full settings editor with schedule, format, filter options
- **Report Generation**: Applies configJson settings to prompt builder and filters items
- **Scheduler Logic**: Checks `scheduleCron` against current time/day before generating reports

**API Routes (Step 8-2 Bots API):**
- `GET /api/bots` - List user's bots with settings
- `POST /api/bots` - Create new bot (body: { name, key })
- `GET /api/bots/:botId` - Get single bot with settings
- `PATCH /api/bots/:botId` - Update bot (partial)
- `DELETE /api/bots/:botId` - Delete bot (cascade: settings + source links)
- `GET /api/bots/:botId/settings` - Get bot settings
- `PUT /api/bots/:botId/settings` - Upsert bot settings
- `GET /api/bots/:botId/sources` - Get linked sources
- `PUT /api/bots/:botId/sources` - Set source links (body: { links: [...] })

**API Routes (Legacy Profiles):**
- `GET /api/presets` - List available bot templates
- `GET/POST /api/profiles` - List user's bots or create new one
- `GET/PUT/DELETE /api/profiles/:id` - Manage specific profile
- `GET/PUT /api/profiles/:id/sources` - Manage sources linked to a profile
- `GET/POST /api/user-sources` - User's sources (includes defaults)
- `GET /api/reports?profileId=X` - List reports (filtered by profile, user-scoped)
- `POST /api/reports/generate` - Generate report for specific profile (requires profileId)

**Frontend Pages:**
- `/profiles` - My Bots list with Create Bot wizard
- `/profiles/:id` - Profile detail/edit page with schedule, config, and source selection
- `/reports` - Reports page with 2-panel layout (list on left, content on right)

### Topic Isolation (Mixing Prevention)
The system enforces strict topic separation to prevent data mixing across different topics (ai_art, investing, tech, crypto):

**4-Layer Protection:**
1. **Source Linking (`setProfileSources`)**: Only sources matching `profile.topic` can be linked
2. **Item Query (`getItemsForReport`)**: SQL filters by `items.topic = profile.topic`
3. **Report Generation**: Explicit topic mismatch check throws error if any item.topic ≠ profile.topic
4. **UI Filtering**: Profile detail page shows only sources matching profile's topic

### Backend Architecture
- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js
- **API Design**: RESTful JSON endpoints under `/api/*`
- **Build**: esbuild bundles server for production as CommonJS

Key server modules:
- `server/routes.ts` - API endpoint definitions
- `server/storage.ts` - Database abstraction layer using repository pattern
- `server/jobs/` - Scheduled background jobs (collect, analyze, draft)
- `server/llm/` - Claude AI integration for content analysis
- `server/services/` - Business logic (RSS parsing, deduplication)
- `server/chat/` - Command Chat system (parser, executor)

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL via connect-pg-simple
- **Protected Routes**: All `/api/*` routes require authentication
- **Auth Routes**:
  - `/api/login` - Initiates Replit OIDC login flow
  - `/api/logout` - Ends session and redirects to Replit logout
  - `/api/callback` - OIDC callback handler
  - `/api/auth/user` - Returns current authenticated user
- **Frontend**: Landing page shown when not authenticated, dashboard accessible after login

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push`)

Core tables:
- `users` - Authenticated users (Replit Auth, stores profile info)
- `sessions` - Session storage for authentication
- `sources` - RSS feed configurations with custom rules
- `items` - Collected posts with status workflow (new → analyzed → drafted → approved → posted)
- `analysis` - LLM analysis results (scores, categories, risk flags)
- `drafts` - Generated reply drafts awaiting review
- `outputs` - Universal output storage (reports, alerts, etc.) with fields:
  - `userId`, `profileId`, `presetId` - ownership and linkage
  - `topic`, `outputType` - categorization ("report", "alert", etc.)
  - `title`, `contentText` - generated content
  - `periodStart`, `periodEnd` - data coverage period
  - Unique index on (profileId, periodStart, periodEnd) prevents duplicates
- `output_items` - Links outputs to source items they were generated from
- `chat_messages` - Chat history with parsed commands and results
- `settings` - Persistent configuration key-value store

### Background Jobs
- **Scheduler**: node-cron for periodic task execution with timezone support (Asia/Seoul)
- **Collect Job**: Every 10 minutes - fetches new items from RSS sources
- **Analyze Job**: Every 5 minutes - runs LLM analysis on new items
- **Draft Job**: Every 5 minutes - generates reply drafts for analyzed items
- **Daily Brief Job**: Every day at 22:00 KST - generates Korean market summary report

### Daily Brief Feature
- **Schedule**: Automated daily at 22:00 KST
- **Lookback**: Analyzes items from last 24 hours
- **Max Items**: Up to 12 most relevant items
- **Output Language**: Korean
- **Sections**: TL;DR, Market Drivers (facts/why/impact/risks), Risk Radar, Checklist, Sources
- **Manual Generation**: Available via Reports page or POST /api/debug/generate-daily-brief

### LLM Integration
- **Provider**: Anthropic Claude API
- **Model**: claude-sonnet-4-5-20250929 (configurable via CLAUDE_MODEL env)
- **Prompts**: Topic-based prompt routing (ai_art vs investing)
- **Output**: Structured JSON for analysis and draft generation

### AI Art Community Contribution Mode
The ai_art topic operates in "community contribution mode" with zero promotional content:

**Three-Layer Protection:**
1. **Prompt Layer**: LLM instructed to never include links, brands, or promotional language
2. **Validation Layer**: Server-side regex checks reject drafts with URLs, forbidden brands, or promo patterns
3. **Storage Layer**: Forces `includesLink=false` for all ai_art drafts

**Forbidden Content:**
- URLs and links of any kind
- Brand mentions: civitai, promptbase, artstation, deviantart (aiartmarket.io는 홍보 대상)
- Promotional phrases: "check out", "I recommend", "sign up", "free trial", etc.

**Goal:** Build community reputation as a helpful, knowledgeable user — not a promotional bot

### Command Chat Feature
Natural language interface for bot control using Claude to parse commands.

**Whitelisted Commands:**
- `generate_report` - Create market brief (topic: ai_art/investing, lookbackHours: 1-168, maxItems: 5-30)
- `run_pipeline` - Execute pipeline jobs (collect, analyze, draft)
- `set_preference` - Configure settings (default_topic, daily_brief_time_kst, draft_threshold_profile)
- `help` - Show available commands

**Validation:**
- Topic: ai_art or investing only
- Time format: HH:MM (e.g., 22:00)
- Threshold profiles: default, strict, relaxed
- Parameter clamping applied for ranges

**Architecture:**
- Parser (command-parser.ts): LLM parses natural language to JSON
- Executor (executor.ts): Validates and executes whitelisted commands
- Storage: Messages persisted with commandJson and resultJson

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `LLM_API_KEY` - Anthropic API key for Claude
- `SESSION_SECRET` - Secret for session encryption (auto-provided by Replit)
- `CLAUDE_MODEL` - (Optional) Override default Claude model
- `APP_BASE_URL` - Base URL for promotional links in drafts

### Third-Party Services
- **Anthropic Claude API** - Content analysis and draft generation
- **PostgreSQL** - Primary data storage
- **RSS Feeds** - External content sources (configured per-source)

### Key NPM Packages
- `drizzle-orm` + `drizzle-kit` - Database ORM and migrations
- `rss-parser` - RSS feed parsing
- `node-cron` - Job scheduling
- `express-session` + `connect-pg-simple` - Session management
- `@tanstack/react-query` - Frontend data fetching
- `wouter` - Client-side routing