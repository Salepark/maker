# Maker Desktop App — Installation & Troubleshooting Guide

---

## Download

Download the version for your operating system from:

**GitHub Releases**  
https://github.com/Salepark/maker/releases

| OS      | File | Size |
|----------|------|------|
| Windows | `Maker-Setup.exe` (installer) or `Maker.exe` (portable) | ~280 MB |
| macOS   | `Maker.dmg` | ~280 MB |
| Linux   | `Maker.AppImage` or `maker.deb` | ~280 MB |

---

# Windows Installation

## Install

1. Download `Maker-Setup.exe`
2. Double-click to run
3. Choose installation directory (default recommended)
4. After installation, launch **Maker** from Desktop or Start Menu

## Portable Version

If you prefer not to install, download `Maker.exe` and run it directly.

---

## Windows Troubleshooting

### “Windows protected your PC” (SmartScreen warning)

> Windows Defender SmartScreen prevented an unrecognized app from starting.

**Solution:**
1. Click **More info**
2. Click **Run anyway**

This appears because the app is not code-signed. You only need to allow it once.

---

### White Screen

**Solution:**

1. Fully quit the app (right-click taskbar icon → Close)
2. Wait 10 seconds
3. Reopen Maker

If it still fails, run from Command Prompt to inspect logs:

```cmd
"C:\Users\[YourUser]\AppData\Local\Programs\Maker\Maker.exe"
```

---

### Port 5000 Conflict

> Error: listen EADDRINUSE: address already in use 127.0.0.1:5000

This happens if a previous instance didn’t shut down properly.

**Fix (Command Prompt):**

```cmd
netstat -ano | findstr :5000
taskkill /PID [PID_NUMBER] /F
```

Or using Task Manager:

1. Press `Ctrl + Shift + Esc`
2. Find “Maker” or “Node.js”
3. Click **End Task**
4. Restart Maker

---

# macOS Installation

## Install

1. Download `Maker.dmg`
2. Double-click to open
3. Drag **Maker** into the **Applications** folder
4. Eject the DMG

---

## macOS Troubleshooting

### “Cannot verify developer” / “App cannot be opened”

> ‘Maker’ cannot be opened because it is from an unidentified developer.

This is a standard macOS security warning for unsigned apps.

**Solution 1 — Terminal:**

```bash
sudo xattr -cr /Applications/Maker.app
```

Enter your password, then launch Maker.

**Solution 2 — Finder:**

1. Open Applications
2. Control-click (or two-finger click) Maker.app
3. Select **Open**
4. Click **Open** again in the dialog

You only need to do this once.

---

### App Opens Then Immediately Closes

Run from Terminal to inspect errors:

```bash
/Applications/Maker.app/Contents/MacOS/Maker
```

Error logs will appear in Terminal.

---

### White Screen

If the server started but the UI is blank:

**Fix 1 — Refresh**

Press:

```
Cmd + R
```

**Fix 2 — Kill Port 5000**

```bash
lsof -ti:5000 | xargs kill -9
```

Restart Maker.

**Fix 3 — Check Server Health**

```bash
curl http://127.0.0.1:5000/api/health
```

If you receive a response, the server is running. Press `Cmd + R` to refresh.

---

### Port 5000 Conflict

> Error: listen EADDRINUSE

Fix:

```bash
lsof -ti:5000 | xargs kill -9
```

Restart Maker.

---

### Proper App Exit

To fully quit Maker:

- Click the red window close button, or
- Press `Cmd + Q`

This ensures the internal server shuts down properly.

---

# Linux Installation

## AppImage (Recommended)

```bash
# 1. Make executable
chmod +x Maker.AppImage

# 2. Run
./Maker.AppImage
```

---

## Debian / Ubuntu (.deb)

```bash
# Install
sudo dpkg -i maker_amd64.deb

# Fix dependency issues if needed
sudo apt-get install -f

# Run
maker
```

---

## Linux Troubleshooting

### AppImage Won’t Run

```bash
chmod +x Maker.AppImage
sudo apt-get install fuse libfuse2
```

---

### White Screen

```bash
ss -tlnp | grep 5000
kill $(lsof -ti:5000)
./Maker.AppImage
```

---

### Sandbox Error

> FATAL:setuid_sandbox_host.cc...

Run with:

```bash
./Maker.AppImage --no-sandbox
```

---

# Common Issues

---

## Data Storage Location

Maker stores its SQLite database locally:

| OS | Path |
|----|------|
| Windows | `%AppData%\maker\maker.db` |
| macOS | `~/Library/Application Support/maker/maker.db` |
| Linux | `~/.config/maker/maker.db` |

---

## Reset All Data

To start fresh, delete the `maker.db` file.

**macOS:**

```bash
rm ~/Library/Application\ Support/maker/maker.db
```

**Windows (PowerShell):**

```powershell
Remove-Item "$env:APPDATA\maker\maker.db"
```

---

## Viewing Server Logs

Run Maker from Terminal/Command Prompt to see logs:

| OS | Command |
|----|--------|
| Windows | `"C:\Users\[User]\AppData\Local\Programs\Maker\Maker.exe"` |
| macOS | `/Applications/Maker.app/Contents/MacOS/Maker` |
| Linux | `./Maker.AppImage` |

Look for:

- `[server] serving on port 5000` → server started
- `[server:err]` → server error
- `EADDRINUSE` → port conflict
- `ENOTSUP` → network issue

---

## LLM API Configuration

To enable AI analysis:

1. Launch Maker
2. Open **Settings**
3. Go to **LLM Providers**
4. Enter your API key

Supported providers:

- OpenAI
- Anthropic
- Google AI
- Other BYOL-compatible services

---

# Version Information

- Node.js: v20+ (bundled)
- Electron: v33+
- SQLite: better-sqlite3 (bundled)

---

# Need Help?

Please open an issue on GitHub:

https://github.com/Salepark/maker/issues

Include:

1. Your OS and version (e.g., macOS 15.3, Windows 11)
2. Full error message (from terminal)
3. Screenshot (if possible)
