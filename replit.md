# Makelr Bot Manager

## Overview

Makelr is a workflow design tool that empowers users to create personal automation bots. It enables users to design custom workflows by selecting content sources (like RSS feeds), defining schedules, and specifying output formats. The platform processes content, utilizes AI for analysis, and generates customizable reports. Key features include multi-user bot management with strict topic isolation, preset templates for easy workflow creation, and the ability for users to "Bring Your Own LLM" for AI tasks. The project aims to provide a flexible platform for personalized automation rather than offering pre-built solutions.

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
The application is set up for desktop distribution using Electron, allowing the Express server to run locally with SQLite, and opening a BrowserWindow for the UI.

### Job Run Logging & Diagnostics
The system includes infrastructure for tracking job executions in a `job_runs` table, providing detailed diagnostics and execution history for each bot. This includes API endpoints for checking bot health, last runs, and comprehensive diagnostics.

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