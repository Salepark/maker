# Maker

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](https://github.com/Salepark/maker/releases)
[![Release](https://img.shields.io/github/v/release/Salepark/maker)](https://github.com/Salepark/maker/releases)

> **We don't trust AI. We trust the user's right to control it.**

Maker is a personal automation operating system for the AI era.
Design your own workflows, control your own bots, own your own data.

---

## Features

- Multi-bot management with strict topic isolation
- Template Gallery with guided setup wizard
- Fast-first report pipeline (instant previews, async full reports)
- 11-permission policy engine with audit logging
- Bring Your Own LLM (Anthropic, OpenAI, Google AI, custom endpoints)
- Command Chat — natural language bot control
- Bilingual interface (English / Korean)
- Desktop app (Electron + SQLite) with auto-login
- Cloud deployment (PostgreSQL) with Replit Auth

---

## Getting Started

### Cloud (Replit)

1. Fork this repository on Replit
2. Set up a PostgreSQL database
3. Configure environment variables (`DATABASE_URL`, `SESSION_SECRET`, `LLM_API_KEY`)
4. Run `npm run dev`

### Desktop

See [`LOCAL_SETUP.md`](LOCAL_SETUP.md) for detailed instructions.

```bash
MAKER_DB=sqlite npm run dev          # SQLite browser mode
npm run dev:desktop                   # Electron desktop app
npm run build:desktop && npm run pack:desktop  # Build installer
```

Pre-built installers for Windows, macOS, and Linux are available in [GitHub Releases](https://github.com/Salepark/maker/releases).

---

## Philosophy

Maker exists to help individuals design and control their own automation workflows.

Read the full philosophy: [`docs/PHILOSOPHY_EN.md`](docs/PHILOSOPHY_EN.md)

---

## License

Maker Core is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

This means:

- You may use, study, modify, and redistribute Maker Core.
- If you modify Maker and run it as a **network service (including SaaS)**,
  you must provide the **complete corresponding source code**
  of your running version to users under AGPL-3.0.

The full license text is available in the [`LICENSE`](LICENSE) file.

---

### Commercial Licensing

If you wish to:

- Offer Maker as a hosted service **without AGPL source disclosure obligations**
- Embed Maker into a closed-source commercial product
- Obtain enterprise support or custom licensing terms

Please contact us for a separate commercial license.

- Website: https://makelr.com
- Issues: https://github.com/Salepark/maker/issues

---

### Trademarks

"Maker", the Maker logo, and related brand assets are trademarks of the Maker project.

Forking and modifying the code is allowed under AGPL-3.0.
However, use of the Maker name and branding in a way that implies official endorsement is not permitted without permission.

---

Maker exists to help individuals design and control their own automation workflows.

We do not sell bots.
We build tools for people who build their own automation.
