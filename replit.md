# AI Art Market Bot Manager

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

The frontend is a single-page application with pages for Dashboard, Items, Drafts, Sources, and Settings. Theme switching (light/dark) is supported via CSS custom properties.

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

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push`)

Core tables:
- `sources` - RSS feed configurations with custom rules
- `items` - Collected posts with status workflow (new → analyzed → drafted → approved → posted)
- `analysis` - LLM analysis results (scores, categories, risk flags)
- `drafts` - Generated reply drafts awaiting review
- `users` - Admin authentication

### Background Jobs
- **Scheduler**: node-cron for periodic task execution
- **Collect Job**: Every 10 minutes - fetches new items from RSS sources
- **Analyze Job**: Every 5 minutes - runs LLM analysis on new items
- **Draft Job**: Every 5 minutes - generates reply drafts for analyzed items

### LLM Integration
- **Provider**: Anthropic Claude API
- **Model**: claude-sonnet-4-5-20250929 (configurable via CLAUDE_MODEL env)
- **Prompts**: Korean-language prompts for community-appropriate responses
- **Output**: Structured JSON for analysis and draft generation

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `LLM_API_KEY` - Anthropic API key for Claude
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