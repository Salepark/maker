# Maker Bot Manager

## Overview

Maker is a workflow design tool that empowers users to create personal automation bots. It enables users to design custom workflows by selecting content sources, defining schedules, and specifying output formats. The platform processes content, utilizes AI for analysis, and generates customizable reports. Key features include multi-user bot management with strict topic isolation, preset templates for easy workflow creation, and the ability for users to "Bring Your Own LLM" for AI tasks. The project aims to provide a flexible platform for personalized automation rather than offering pre-built solutions. Maker's core vision is to provide a personal automation OS that allows users to safely control AI.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Principles
Maker development adheres to seven core principles, prioritizing human control, minimum viable permissions, user data ownership, AI transparency, structured decision-making, LLM interchangeability, and human-in-the-loop automation.

### Frontend
A React 18 TypeScript single-page application built with Wouter, TanStack React Query, shadcn/ui, and Tailwind CSS. It features a multi-user interface for bot management, reports, sources, and settings, including light/dark theme support.

### Multi-User Bot Management
The system supports multiple user-defined bots, each focused on a specific topic. Bots can be created from a Template Gallery via a guided wizard, allowing customization of schedules, report sections, verbosity, markdown level, and content filters, ensuring topic isolation.

### Backend
A Node.js and TypeScript application using Express.js, providing RESTful JSON APIs. It manages database interactions, scheduled background jobs, LLM integration, and business logic.

### Data Storage
PostgreSQL serves as the primary database, managed with Drizzle ORM, storing user data, sessions, sources, collected items, analysis results, drafts, and generated outputs. SQLite is supported for local/desktop deployments.

### Background Jobs
Scheduled tasks, managed by `node-cron`, handle content collection from RSS feeds, AI-based analysis, draft generation, and report generation.

### LLM Integration
A multi-provider LLM architecture allows users to integrate their own LLMs (e.g., Anthropic, OpenAI, Google AI, or custom OpenAI-compatible endpoints). API keys are encrypted, and users can assign specific LLM providers and models to their bots. Prompts are topic-based, and outputs are structured JSON.

### Command Chat
A natural language interface, powered by Claude AI, enables users to control bots via chat commands. The core chat engine provides reusable `processMessage` and `processConfirm` functions used by both the web UI and external adapters.

### External Messaging Adapters
A modular adapter system (`server/adapters/`) connects Maker to external messaging platforms. A Telegram adapter is implemented, with Discord and Slack planned.

### Report Generation & Pipeline
A multi-stage report pipeline (Fast, Status, Full Report) ensures efficiency and cost optimization, providing immediate feedback and background processing for detailed AI analysis, with built-in timeouts and graceful fallbacks.

### Internationalization (i18n)
The application supports English and Korean using a homegrown i18n system, with language preferences persisted and all UI text localized.

### Multi-DB Architecture
Supports both PostgreSQL (cloud) and SQLite (local desktop) based on environment variables, with schema mirroring and driver abstraction.

### Electron Desktop Packaging
The application is set up for desktop distribution using Electron, allowing the Express server to run locally with SQLite, and opening a BrowserWindow for the UI.

### Job Run Logging & Diagnostics
Infrastructure for tracking job executions in a `job_runs` table provides detailed diagnostics and execution history for each bot, including API endpoints for checking bot health and last runs.

### Report Pipeline Reliability
Includes server-side timeouts, client-side UI feedback for stalls, and background job processing with detailed `job_run` logging. A Fast Report template provides immediate previews, while a `report_metrics` table stores per-report data for trend analysis.

### Permission System v1.0
A comprehensive permission and policy system controls bot capabilities. It includes a `permissions` table, `audit_logs` table, and a policy engine (`server/policy/`) with `getEffectivePermissions`, `checkPermission`, `checkEgress` (3-level LLM data control), and `logPermissionAction`. Permissions can be `AUTO_ALLOWED`, `APPROVAL_REQUIRED`, or `AUTO_DENIED`. The system integrates with API routes, provides a permission request UX for user approvals, and offers a dedicated UI for managing global defaults and bot-level permissions, with platform-aware filtering for web vs. desktop.

### Long-Term Memory System (Phase 1: Rule Memory)
A 3-layer memory architecture, starting with Rule Memory, stores user preferences and knowledge in a `rule_memories` table. It supports CRUD operations and provides `getEffectiveRules` for merging global and bot-specific rules. Permission keys `MEMORY_WRITE` and `DATA_RETENTION` are integrated into the policy engine. Report generation integrates these rules into LLM prompts. A `MemoryCard` UI component allows users to manage rules with preset key selections, scope toggles, and an effective rules panel.

## External Dependencies

### Environment Variables
- `DATABASE_URL` (for PostgreSQL)
- `MAKER_DB` (`sqlite` for local mode)
- `MAKER_SQLITE_PATH` (custom SQLite path)
- `LLM_API_KEY`
- `SESSION_SECRET`
- `CLAUDE_MODEL`
- `APP_BASE_URL`
- `TELEGRAM_BOT_TOKEN` (for Telegram integration)
- `DATA_GO_KR_API_KEY` (for data.go.kr)

### Third-Party Services
- Anthropic Claude API
- PostgreSQL
- SQLite
- RSS Feeds
- data.go.kr 국세청 사업자등록정보 API
- Replit Auth
- Telegram Bot API (optional)

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`
- `better-sqlite3`
- `rss-parser`
- `node-cron`
- `express-session`, `connect-pg-simple`
- `@tanstack/react-query`
- `wouter`