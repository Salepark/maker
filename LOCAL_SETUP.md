# Maker Desktop - Setup & Run Guide

---

## Download Installers (Easiest Method)

Download the installer for your OS from GitHub Releases:

**[https://github.com/Salepark/maker/releases](https://github.com/Salepark/maker/releases)**

| OS | Download File | How to Install |
|----|---------------|----------------|
| Windows | `Maker.exe` (portable) or `Maker-Setup.exe` (installer) | Double-click to run |
| Mac | `Maker.dmg` | Double-click > Drag Maker to Applications |
| Linux | `Maker.AppImage` | `chmod +x Maker.AppImage` then run |

Installers are automatically updated with each new code release.

### Mac: "Cannot verify developer" warning

Right-click Maker.app > Select "Open" (only needed once).

---

## Build from Source (For Developers)

Below are instructions for cloning the code and running in development mode.

`clone` -> `npm install` -> `npm run dev:desktop` — That's it, 3 steps.

---

## Prerequisites

### Required Software

| Item | Minimum Version | Check Command |
|------|-----------------|---------------|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | Latest | `git --version` |

### OS-Specific Preparation

**Mac:**
```bash
xcode-select --install
```

**Windows:**
- Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-studio-build-tools/)
- Select "C++ Build Tools" workload

---

## STEP 1 - Clone & Install

```bash
git clone https://github.com/Salepark/maker.git
cd maker
npm install
```

If you get a `better-sqlite3` related error after `npm install`:
```bash
npm rebuild better-sqlite3
```

---

## STEP 2 - Run in Dev Mode

```bash
npm run dev:desktop
```

This single command works on Mac / Windows / Linux.
(`cross-env` handles environment variables consistently across all OSes)

Under the hood, it runs:
```
cross-env MAKER_DB=sqlite MAKER_DESKTOP=true NODE_ENV=development electron -r tsx/register electron/main.ts
```

### What success looks like

1. Terminal shows `[electron] Starting Maker desktop app...`
2. Terminal shows `[server] serving on port 5000`
3. Electron window opens
4. Dashboard loads immediately **without a login screen** (local auto-login)

### Basic Checks

| Check | Expected Result |
|-------|-----------------|
| Electron window | Dashboard is displayed |
| Login process | None (auto-login) |
| Health check | Visit `http://localhost:5000/api/health` in browser — should show `driver: "sqlite"` |

**If you've reached this point, you're 80% done.**

---

## STEP 3 - Test Basic Features

### Add Sources & Test Fast Report

1. Click "Sources" in the sidebar
2. Add an RSS source (e.g., `https://news.ycombinator.com/rss`)
3. Click "Run Now" on the bot detail page
4. Confirm a Fast Report is generated within 2–3 seconds

### Verify SQLite File

Adding a source automatically creates the SQLite database file:

**Mac:**
```bash
ls ~/Library/Application\ Support/Maker/maker.db
```

**Windows:**
```powershell
dir "$env:APPDATA\Maker\maker.db"
```

**Linux:**
```bash
ls ~/.config/Maker/maker.db
```

If the file exists, data is being saved correctly.

---

## STEP 4 - Production Build (Optional)

To create distributable executables (.app, .exe):

```bash
# 1. Bundle client + server
npm run build:desktop

# 2. Package into executable
npm run pack:desktop
```

Output is generated in the `dist-electron/` folder:

| OS | Output Files |
|----|-------------|
| Mac | `Maker.app`, `Maker.dmg` |
| Windows | `Maker.exe` (portable), `Maker Setup.exe` (installer) |
| Linux | `Maker.AppImage`, `maker.deb` |

---

## Troubleshooting

### 1. Electron window opens but screen is blank

**Cause:** Page loaded before the server finished starting.

**Fix:**
- Check terminal for the `[server] serving on port 5000` log
- Press `Cmd+R` (Mac) / `Ctrl+R` (Windows) to refresh

### 2. `better-sqlite3` native module error

```
Error: Module did not self-register
```

**Fix:**
```bash
npm rebuild better-sqlite3
```

If the error persists on Mac:
```bash
npm rebuild better-sqlite3 --build-from-source
```

### 3. `npm run dev:desktop` doesn't work (manual run)

Run directly without the script:

**Mac / Linux:**
```bash
MAKER_DB=sqlite MAKER_DESKTOP=true NODE_ENV=development npx electron -r tsx/register electron/main.ts
```

**Windows (PowerShell):**
```powershell
$env:MAKER_DB="sqlite"
$env:MAKER_DESKTOP="true"
$env:NODE_ENV="development"
npx electron -r tsx/register electron/main.ts
```

**Windows (CMD):**
```cmd
set MAKER_DB=sqlite
set MAKER_DESKTOP=true
set NODE_ENV=development
npx electron -r tsx/register electron/main.ts
```

### 4. Port 5000 already in use

**Fix:**
```bash
# Mac/Linux
lsof -i :5000 | grep LISTEN
kill -9 <PID>

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### 5. Code signing warning on Mac during packaging

Building without code signing on Mac will trigger a "Cannot verify developer" warning.

**Workaround for testing:**
- Right-click `Maker.app` > Select "Open" (only needed once)

**Or skip signing during build:**
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run pack:desktop
```

### 6. Server process remains running after app closes

```bash
# Mac/Linux
pkill -f "tsx server/index.ts"

# Windows
taskkill /F /IM node.exe
```

---

## Executable Testing Checklist

After launching the built executable, verify the following:

| Test Item | Pass |
|-----------|------|
| App launches (double-click) | |
| Dashboard loads without login | |
| Add RSS source | |
| Fast Report generated (2–3 sec) | |
| SQLite file created | |
| Data persists after restart | |
| Fast Report works offline | |

---

## npm Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run dev:desktop` | Run Electron in dev mode (SQLite, auto-login) |
| `npm run build:desktop` | Bundle client + server for production |
| `npm run pack:desktop` | Package into .app / .exe / .AppImage |
| `npm run dev` | Run cloud mode server (PostgreSQL) |

---

## Project Structure (Desktop-related)

```
maker/
├── electron/
│   ├── main.ts               # Electron main process (starts server, creates window)
│   ├── preload.ts            # Exposes window.maker / window.electronAPI to renderer
│   └── electron-builder.yml  # Packaging configuration
├── script/
│   ├── build.ts              # Cloud build script
│   └── build-desktop.ts      # Desktop build script (server + client + Electron)
├── server/
│   ├── db.ts                 # DB driver selector (PostgreSQL / SQLite)
│   ├── init-sqlite.ts        # SQLite table initialization
│   └── storage-sqlite.ts     # SQLite-specific storage implementation
├── shared/
│   ├── schema.ts             # PostgreSQL schema (Drizzle)
│   └── schema.sqlite.ts      # SQLite schema (Drizzle)
└── LOCAL_SETUP.md            # This document
```

---

## Next Steps (After Testing)

1. App icon & branding
2. Auto-update (electron-updater)
3. Code signing (Apple Developer / Windows Authenticode)
4. Distribution channel setup (GitHub Releases)

---

## Need Help?

Check the terminal logs when running in dev mode:
- `[electron]` — Electron main process logs
- `[server]` — Express server logs
- `[server:err]` — Server error logs

Include these logs when reporting issues for faster resolution.
