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

### Console Prompt Hints
The Console provides context-sensitive autocomplete and hints based on the user's current state (e.g., no bot selected, no sources, ready state), offering suggestions for next actions and diagnostics.

## External Dependencies

### Environment Variables
- `DATABASE_URL`
- `LLM_API_KEY`
- `SESSION_SECRET`
- `CLAUDE_MODEL`
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