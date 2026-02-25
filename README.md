# Maker — Control-First AI Operating System

> We don't trust AI. We trust the user's right to control it.

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](https://github.com/Salepark/maker/releases)
[![Release](https://img.shields.io/github/v/release/Salepark/maker)](https://github.com/Salepark/maker/releases)

Maker is not a company that makes AI stronger.
Maker is a company that makes AI **controllable**.

We believe AI automation must go beyond convenience — it must be **operable**.
AI is a tool. Judgment and responsibility must remain with humans.

Maker builds a **Control-First AI OS** that helps individuals design, control, and audit their own automation systems.

[Website](https://maker.am) · [Download Desktop](https://github.com/Salepark/maker/releases)

---

## Our Mission

**Build an AI operating system that humans can control.**

AI is advancing rapidly. But control structures have not kept pace.
Maker exists to close that gap.

- Visibility into AI execution
- Policy-based control
- Risk budget management
- Data ownership guarantee
- Explainable autonomy

As AI grows more powerful, control must grow more sophisticated.

---

## Our Philosophy

**We don't trust AI. We trust the user's right to control it.**

Maker stands on seven principles:

| # | Principle | Description |
|---|-----------|-------------|
| 1 | **Nothing Runs Silently** | Every execution is logged. |
| 2 | **Autonomy Must Be Bounded** | Autonomy must exist within time, steps, and risk budgets. |
| 3 | **Data Belongs to the User** | Your data stays with you. |
| 4 | **Policy Before Power** | Permissions must be designed before capabilities. |
| 5 | **Explanation Is Mandatory** | AI actions must be explainable. |
| 6 | **Risk Must Be Measurable** | Risk must be quantified and managed. |
| 7 | **Human Remains Accountable** | Final responsibility always lies with humans. |

---

## What We Are Not

Maker is different from:

- Unlimited autonomous agent platforms
- Black-box automation tools
- Data-collection-centric SaaS
- Systems that delegate full authority to AI

**We do not pursue autonomy without control.**

---

## What Is Maker?

Maker is not an AI automation tool.
It's not a simple agent framework.
It's not a newsletter generation service.

> **Maker is a personal AI execution kernel.**

Inside Maker, AI must:

- Pass through policies
- Stay within the risk budget
- Be logged
- Be explained

---

## Features

- Multi-bot management with strict topic isolation
- Template Gallery with guided setup wizard
- Fast-first report pipeline (instant previews, async full reports)
- 11-permission policy engine with audit logging and risk budget
- Bring Your Own LLM (Anthropic, OpenAI, Google AI, custom endpoints)
- Command Chat — natural language bot control
- Bilingual interface (English / Korean)
- Desktop app (Electron + SQLite) with auto-login
- Cloud deployment (PostgreSQL) with Replit Auth

---

## Getting Started

### Desktop (Recommended)

Pre-built installers for Windows, macOS, and Linux are available in [GitHub Releases](https://github.com/Salepark/maker/releases).

See [`LOCAL_SETUP.md`](LOCAL_SETUP.md) for detailed instructions.

```bash
MAKER_DB=sqlite npm run dev          # SQLite browser mode
npm run dev:desktop                   # Electron desktop app
npm run build:desktop && npm run pack:desktop  # Build installer
```

### Cloud (Replit)

1. Fork this repository on Replit
2. Set up a PostgreSQL database
3. Configure environment variables (`DATABASE_URL`, `SESSION_SECRET`, `LLM_API_KEY`)
4. Run `npm run dev`

---

## Long-Term Vision

We are not just building an app. We are building:

> **A controllable operating system for the AI era.**

- **Phase 1:** Personal Maker OS
- **Phase 2:** Distributed execution + local control
- **Phase 3:** Organization-level governance

But the starting point is always the same — **individual control**.

---

## Why Now

AI is rapidly becoming mainstream. But we ask:

- Who controls it?
- By what criteria is it executed?
- What data is leaving the system?
- When it fails, who is responsible?

Maker started from these questions.

---

## Founder's Note

Maker did not start from fear. But it did not start from uncritical optimism either.

AI is powerful. That is precisely why control structures are necessary.

Maker is not a project to make AI stronger — it is an effort to make AI safe to use.

---

## License

Maker Core is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

- You may use, study, modify, and redistribute Maker Core.
- If you modify Maker and run it as a **network service (including SaaS)**,
  you must provide the **complete corresponding source code**
  of your running version to users under AGPL-3.0.

The full license text is available in the [`LICENSE`](LICENSE) file.

### Commercial Licensing

If you wish to:

- Offer Maker as a hosted service **without AGPL source disclosure obligations**
- Embed Maker into a closed-source commercial product
- Obtain enterprise support or custom licensing terms

Please contact us for a separate commercial license.

- Website: https://maker.am
- Issues: https://github.com/Salepark/maker/issues

### Trademarks

"Maker", the Maker logo, and related brand assets are trademarks of the Maker project.

Forking and modifying the code is allowed under AGPL-3.0.
However, use of the Maker name and branding in a way that implies official endorsement is not permitted without permission.

---

> Maker is the execution infrastructure that transforms "Autonomous AI" into "Governable AI".
