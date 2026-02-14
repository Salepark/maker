# Maker Desktop — Setup & Run Guide

---

# Download Installers (Easiest Method)

Download the installer for your OS from GitHub Releases:

https://github.com/Salepark/maker/releases

| OS      | Download File                     | How to Install                              |
|----------|----------------------------------|---------------------------------------------|
| Windows  | `Maker.exe` (portable) or `Maker-Setup.exe` | Double-click to run |
| macOS    | `Maker.dmg`                      | Double-click → Drag Maker to Applications   |
| Linux    | `Maker.AppImage`                 | `chmod +x Maker.AppImage` then run          |

Installers are automatically updated with each new release.

### macOS: “Cannot verify developer” Warning

Right-click `Maker.app` → Select **Open** (only needed once).

---

# Build from Source (For Developers)

Clone → Install → Run.  
That’s it.

```
git clone https://github.com/Salepark/maker.git
cd maker
npm install
npm run dev:desktop
```

---

# Prerequisites

## Required Software

| Item     | Minimum Version | Check Command |
|----------|-----------------|---------------|
| Node.js  | 18+             | `node -v`     |
| npm      | 9+              | `npm -v`      |
| Git      | Latest          | `git --version` |

---

## OS-Specific Preparation

### macOS

```
xcode-select --install
```

### Windows

Install **Visual Studio Build Tools**

Select:
- "C++ Build Tools" workload

---

# STEP 1 — Clone & Install

```
git clone https://github.com/Salepark/maker.git
cd maker
npm install
```

If you get a `better-sqlite3` error:

```
npm rebuild better-sqlite3
```

---

# STEP 2 — Run in Dev Mode

```
npm run dev:desktop
```

This works on macOS / Windows / Linux.

Under the hood, it runs:

```
cross-env MAKER_DB=sqlite MAKER_DESKTOP=true NODE_ENV=development electron -r tsx/register electron/main.ts
```

---

# What Success Looks Like

Terminal shows:

```
[electron] Starting Maker desktop app...
[server] serving on port 5000
```

Electron window opens.

Dashboard loads immediately (no login screen — auto-login enabled).

---

# Basic Checks

| Check | Expected Result |
|--------|----------------|
| Electron window | Dashboard visible |
| Login process | None (auto-login) |
| Health check | Visit `http://localhost:5000/api/health` → driver: "sqlite" |

If you reach here, you're 80% done.

---

# STEP 3 — Test Basic Features

## Add RSS Source

1. Click **Sources**
2. Add RSS URL (example: https://news.ycombinator.com/rss)
3. Click **Run Now**
4. Confirm Fast Report appears in 2–3 seconds

---

## Verify SQLite File Creation

macOS:

```
ls ~/Library/Application\ Support/Maker/maker.db
```

Windows (PowerShell):

```
dir "$env:APPDATA\Maker\maker.db"
```

Linux:

```
ls ~/.config/Maker/maker.db
```

If file exists → database is working.

---

# STEP 4 — Production Build (Optional)

Create distributable executables:

```
# Bundle client + server
npm run build:desktop

# Package executable
npm run pack:desktop
```

Output folder:

```
dist-electron/
```

| OS | Output Files |
|----|--------------|
| macOS | Maker.app, Maker.dmg |
| Windows | Maker.exe, Maker Setup.exe |
| Linux | Maker.AppImage, maker.deb |

---

# Troubleshooting

---

## 1. Electron Window Opens but Blank Screen

Cause: UI loaded before server finished starting.

Fix:

- Confirm terminal shows `[server] serving on port 5000`
- Press `Cmd+R` (Mac) or `Ctrl+R` (Windows)

---

## 2. better-sqlite3 Native Module Error

Error:
```
Module did not self-register
```

Fix:

```
npm rebuild better-sqlite3
```

On macOS (if needed):

```
npm rebuild better-sqlite3 --build-from-source
```

---

## 3. Manual Run (If npm script fails)

### macOS / Linux

```
MAKER_DB=sqlite MAKER_DESKTOP=true NODE_ENV=development npx electron -r tsx/register electron/main.ts
```

### Windows (PowerShell)

```
$env:MAKER_DB="sqlite"
$env:MAKER_DESKTOP="true"
$env:NODE_ENV="development"
npx electron -r tsx/register electron/main.ts
```

### Windows (CMD)

```
set MAKER_DB=sqlite
set MAKER_DESKTOP=true
set NODE_ENV=development
npx electron -r tsx/register electron/main.ts
```

---

## 4. Port 5000 Already in Use

### macOS / Linux

```
lsof -i :5000 | grep LISTEN
kill -9 <PID>
```

### Windows

```
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 5. Code Signing Warning on macOS

Testing workaround:

Right-click `Maker.app` → Select **Open**

Or skip signing:

```
CSC_IDENTITY_AUTO_DISCOVERY=false npm run pack:desktop
```

---

## 6. Server Process Remains Running After Close

### macOS / Linux

```
pkill -f "tsx server/index.ts"
```

### Windows

```
taskkill /F /IM node.exe
```

---

# Executable Testing Checklist

After launching built executable:

| Test Item | Pass |
|-----------|------|
| App launches | ☐ |
| Dashboard loads without login | ☐ |
| Add RSS source | ☐ |
| Fast Report generated (2–3 sec) | ☐ |
| SQLite file created | ☐ |
| Data persists after restart | ☐ |
| Fast Report works offline | ☐ |

---

# npm Scripts Reference

| Script | Purpose |
|---------|----------|
| `npm run dev:desktop` | Run Electron in dev mode |
| `npm run build:desktop` | Bundle client + server |
| `npm run pack:desktop` | Package executable |
| `npm run dev` | Run cloud mode (PostgreSQL) |

---

# Project Structure (Desktop Related)

```
maker/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── electron-builder.yml
├── script/
│   ├── build.ts
│   └── build-desktop.ts
├── server/
│   ├── db.ts
│   ├── init-sqlite.ts
│   └── storage-sqlite.ts
├── shared/
│   ├── schema.ts
│   └── schema.sqlite.ts
└── LOCAL_SETUP.md
```

---

# Next Steps (After Testing)

- App icon & branding
- Auto-update (electron-updater)
- Code signing (Apple Developer / Windows Authenticode)
- Distribution channel (GitHub Releases)

---

# Need Help?

When reporting issues, include terminal logs:

```
[electron] — Electron logs
[server] — Express logs
[server:err] — Error logs
```

GitHub Issues:
https://github.com/Salepark/maker/issues
