import { app, BrowserWindow, shell, ipcMain } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const SERVER_PORT = 5000;
const HEALTH_URL = `http://localhost:${SERVER_PORT}/api/health`;
const isDev = process.env.NODE_ENV === "development";

function getServerEntry(): string {
  if (isDev) {
    return path.join(__dirname, "..", "server", "index.ts");
  }
  return path.join(process.resourcesPath, "server", "index.js");
}

function getDataDir(): string {
  return app.getPath("userData");
}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const entry = getServerEntry();
    const dataDir = getDataDir();

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      MAKER_DB: "sqlite",
      MAKER_SQLITE_PATH: path.join(dataDir, "maker.db"),
      PORT: String(SERVER_PORT),
      NODE_ENV: isDev ? "development" : "production",
    };

    const cmd = isDev ? "npx" : "node";
    const args = isDev ? ["tsx", entry] : [entry];

    serverProcess = spawn(cmd, args, {
      env,
      stdio: ["pipe", "pipe", "pipe"],
      cwd: path.join(__dirname, ".."),
    });

    serverProcess.stdout?.on("data", (data: Buffer) => {
      const msg = data.toString();
      console.log(`[server] ${msg}`);
      if (msg.includes("serving on port") || msg.includes("listening")) {
        resolve();
      }
    });

    serverProcess.stderr?.on("data", (data: Buffer) => {
      console.error(`[server:err] ${data.toString()}`);
    });

    serverProcess.on("error", (err: Error) => {
      console.error("[server] Failed to start:", err);
      reject(err);
    });

    serverProcess.on("exit", (code: number | null) => {
      console.log(`[server] Exited with code ${code}`);
      serverProcess = null;
    });

    setTimeout(() => resolve(), 8000);
  });
}

async function waitForHealth(maxRetries = 30, intervalMs = 500): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(HEALTH_URL);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "Maker",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.on("open-external", (_event, url: string) => {
  if (typeof url === "string" && url.startsWith("http")) {
    shell.openExternal(url);
  }
});

app.whenReady().then(async () => {
  console.log("[electron] Starting Maker desktop app...");
  console.log(`[electron] Data dir: ${getDataDir()}`);

  try {
    await startServer();
    const healthy = await waitForHealth();
    if (!healthy) {
      console.warn("[electron] Server health check timed out, loading anyway...");
    }
    createWindow();
  } catch (err) {
    console.error("[electron] Failed to start server:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
});
