# Maker Desktop App - Installation & Troubleshooting Guide

---

## Download

Download the installer for your OS from **[GitHub Releases](https://github.com/Salepark/maker/releases)**.

| OS | File | Size |
|----|------|------|
| Windows | `Maker-Setup.exe` (installer) or `Maker.exe` (portable) | ~280 MB |
| Mac | `Maker.dmg` | ~280 MB |
| Linux | `Maker.AppImage` or `maker.deb` | ~280 MB |

---

## Windows Installation

### Install

1. Download `Maker-Setup.exe`
2. Double-click to run
3. Choose install location (default recommended)
4. After installation, launch **Maker** from the desktop or Start menu

### Portable Version

To use without installing, download `Maker.exe` and run it directly.

### Windows Troubleshooting

#### "Windows protected your PC" warning (SmartScreen)

> Windows Defender SmartScreen prevented an unrecognized app from starting.

**Fix:**
1. Click "More info"
2. Click "Run anyway"

This warning appears for unsigned apps and only needs to be dismissed once.

#### Blank Screen (White Screen)

**Fix:**
1. Fully close the app (right-click on taskbar > Close)
2. Wait 10 seconds, then relaunch
3. If it persists, run from Command Prompt to see error details:
```cmd
"C:\Users\[YourUsername]\AppData\Local\Programs\Maker\Maker.exe"
```

#### Port 5000 Conflict

> Error: listen EADDRINUSE: address already in use 127.0.0.1:5000

This occurs when a previous instance wasn't fully closed.

**Fix (Command Prompt):**
```cmd
netstat -ano | findstr :5000
taskkill /PID [displayed_PID] /F
```

**Or via Task Manager:**
1. Press `Ctrl+Shift+Esc` to open Task Manager
2. Find "Maker" or "Node.js" process
3. Click "End task"
4. Relaunch Maker

---

## Mac Installation

### Install

1. Download `Maker.dmg`
2. Double-click to open the DMG
3. Drag the Maker icon to the **Applications** folder
4. Eject the DMG (right-click disk icon > Eject)

### Mac Troubleshooting

#### "Cannot verify developer" / "Cannot confirm it is free from malware"

> "Maker" is from an unidentified developer and cannot be opened.

This is a macOS security warning for unsigned apps.

**Fix (Method 1 — Terminal):**
```bash
sudo xattr -cr /Applications/Maker.app
```
Enter your password, then launch Maker.

**Fix (Method 2 — Finder):**
1. Open the Applications folder in Finder
2. **Control-click** (or two-finger tap on trackpad) on Maker.app
3. Select **"Open"** from the menu
4. Click **"Open"** in the warning dialog

This only needs to be done once.

#### App closes immediately after launch

**Check the cause — run from Terminal:**
```bash
/Applications/Maker.app/Contents/MacOS/Maker
```
Error messages will appear in the terminal.

#### Blank Screen (White Screen)

If the server started but the screen is empty:

**Fix 1 — Refresh:**
- Press `Cmd + R` to reload the page

**Fix 2 — Check for port conflict:**
```bash
lsof -ti:5000 | xargs kill -9
```
Then relaunch Maker.

**Fix 3 — Verify server status from Terminal:**
```bash
curl http://127.0.0.1:5000/api/health
```
If you get a response, the server is running fine. Press `Cmd + R` to refresh.

#### Port 5000 Conflict

> Error: listen EADDRINUSE: address already in use 127.0.0.1:5000

This occurs when a previous instance wasn't fully closed.

**Fix:**
```bash
lsof -ti:5000 | xargs kill -9
```
Then relaunch Maker.

#### How to Fully Quit the App

To completely close Maker:
- Click the **red X button** on the window, or
- Press **Cmd + Q**

This also shuts down the server.

---

## Linux Installation

### AppImage (Recommended)

```bash
# 1. Make the downloaded file executable
chmod +x Maker.AppImage

# 2. Run
./Maker.AppImage
```

### Debian/Ubuntu (.deb)

```bash
# 1. Install
sudo dpkg -i maker_amd64.deb

# 2. Fix dependency issues (if any)
sudo apt-get install -f

# 3. Run
maker
```

### Linux Troubleshooting

#### AppImage won't run

```bash
# Check execution permission
chmod +x Maker.AppImage

# FUSE may be required
sudo apt-get install fuse libfuse2
```

#### Blank Screen

```bash
# Check port
ss -tlnp | grep 5000

# Kill existing process if port is in use
kill $(lsof -ti:5000)

# Relaunch
./Maker.AppImage
```

#### Sandbox Error

> FATAL:setuid_sandbox_host.cc - The SUID sandbox helper binary was found...

```bash
# Run with --no-sandbox flag
./Maker.AppImage --no-sandbox
```

---

## Common Issues

### Data Storage Location

Maker stores its data in a local SQLite database:

| OS | Path |
|----|------|
| Windows | `%AppData%\maker\maker.db` |
| Mac | `~/Library/Application Support/maker/maker.db` |
| Linux | `~/.config/maker/maker.db` |

### Reset Data

To delete all data and start fresh, remove the `maker.db` file at the path above.

**Mac:**
```bash
rm ~/Library/Application\ Support/maker/maker.db
```

**Windows (PowerShell):**
```powershell
Remove-Item "$env:APPDATA\maker\maker.db"
```

### Checking Server Logs

If issues persist, run the app from the terminal to see detailed logs:

| OS | Command |
|----|---------|
| Windows | `"C:\Users\[YourUsername]\AppData\Local\Programs\Maker\Maker.exe"` |
| Mac | `/Applications/Maker.app/Contents/MacOS/Maker` |
| Linux | `./Maker.AppImage` (from terminal) |

Key log messages to look for:
- `[server] serving on port 5000` — Server started successfully
- `[server:err]` — Server error
- `EADDRINUSE` — Port conflict
- `ENOTSUP` — Network error

### LLM API Key Setup

To use AI analysis features, configure your LLM provider in the app:
1. Launch Maker
2. Click **Settings** in the sidebar
3. Enter your API key in the **LLM Providers** section
4. Supported services: OpenAI, Anthropic, Google AI, and more

---

## Version Info

- Node.js: v20+ (bundled)
- Electron: v33+
- SQLite: better-sqlite3 (bundled)

---

## Need Help?

Report issues with error messages on GitHub Issues:
**[https://github.com/Salepark/maker/issues](https://github.com/Salepark/maker/issues)**

When reporting, please include:
1. OS type and version (e.g., macOS 15.3, Windows 11)
2. Full error message (run from terminal to capture)
3. Screenshots (if possible)
