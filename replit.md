# Makelr Bot Manager

## Overview

Makelr Bot Manager is an AI-powered platform for content monitoring and community engagement, primarily for AI art marketplaces. It automates the collection, analysis, and response drafting for online content, with a human-in-the-loop approval process. The system processes content from RSS feeds, uses AI for relevance scoring and risk identification, and generates contextual replies. It supports multi-user bot management, customizable report generation, and topic isolation. The platform aims to provide valuable insights and facilitate engagement while ensuring brand safety and adherence to community guidelines.

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

**E2E coverage**: Login → browse gallery → create bot from preset → verify redirect → delete bot

### Backend
The backend is built with Node.js and TypeScript using Express.js, providing RESTful JSON APIs. It includes modules for database abstraction, scheduled background jobs (collect, analyze, draft), LLM integration, and business logic. Authentication is handled via Replit Auth with PostgreSQL for session storage, and all API routes are protected.

### Data Storage
PostgreSQL is used as the primary database, managed with Drizzle ORM. Key tables include `users`, `sessions`, `sources`, `items`, `analysis`, `drafts`, `outputs`, and `llm_providers`. A universal `outputs` table stores various generated content, linked to specific users and profiles.

### Background Jobs
Scheduled tasks, managed by node-cron, include:
- **Collect Job**: Fetches new items from RSS feeds.
- **Analyze Job**: Performs LLM-based analysis on collected items.
- **Draft Job**: Generates reply drafts for analyzed items.
- **Daily Brief Job**: Generates a daily market summary report in Korean.

### LLM Integration
The system features a multi-provider LLM architecture, allowing users to "Bring Your Own LLM" (BYO LLM). It supports Anthropic, OpenAI, Google AI, and custom (OpenAI-compatible) providers. API keys are encrypted, and users can assign specific LLM providers and models to their bots. System-level jobs use a default LLM, while bot-specific operations can leverage user-configured providers. Prompts are topic-based, and outputs are structured JSON.

### AI Art Community Contribution Mode
For the 'ai_art' topic, the system enforces a strict "community contribution mode" to prevent promotional content. This involves LLM prompt instructions, server-side validation using regex checks to reject forbidden content (URLs, specific brand mentions, promotional phrases), and forcing `includesLink=false` for all AI art drafts.

### Command Chat (Phase 6 v1.0)
A natural language interface, powered by Claude AI, allows users to control bots via chat commands. The system supports 8 bot-centric commands: `list_bots`, `switch_bot`, `bot_status`, `run_now`, `pause_bot`, `resume_bot`, `add_source`, `remove_source`. Commands are parsed by LLM into a structured JSON schema `{type, botKey, args, confidence, needsConfirm, confirmText}`.

**Two-step execution flow (semi-automatic):**
- `POST /api/chat/message` — Parses user input, returns confirm payload for data-changing commands
- `POST /api/chat/confirm` — Executes on approval, marks pending message as confirmed/cancelled
- `GET /api/chat/active-bot` — Returns currently active bot for the user

**Active bot context:** Per-user active bot stored in settings. Commands without explicit botKey use the active bot. UI shows active bot indicator at the top.

**Confirmation UX:** Data-modifying commands (run_now, pause_bot, resume_bot, add_source, remove_source) show approve/cancel buttons. Read-only commands (list_bots, bot_status, switch_bot) execute immediately.

**Chat messages are user-scoped** (userId column) with status tracking (done, pending_confirm, confirmed, cancelled).

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