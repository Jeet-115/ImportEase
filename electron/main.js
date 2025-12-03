import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import updaterPkg from "electron-updater";
const { autoUpdater } = updaterPkg;
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import crypto from "node:crypto";
import machineIdPkg from "node-machine-id";
import { getBaseDir, ensurePreferredDataDir, setBaseDir } from "./fileService.js";

const { machineIdSync } = machineIdPkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseEnvIsDev = process.env.NODE_ENV !== "production";
const isDevLike = baseEnvIsDev || !app.isPackaged;

// Get app path - in packaged apps, this points to resources/app.asar or resources/app
const getAppPath = () => {
  if (app.isPackaged) {
    // In packaged app, app.getAppPath() returns the asar path or unpacked app path
    return app.getAppPath();
  }
  // In development, use __dirname relative path
  return path.resolve(__dirname, "..");
};

const APP_PATH = getAppPath();
const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL ??
  process.env.FRONTEND_DEV_SERVER ??
  "http://localhost:5173";
const BACKEND_PORT = process.env.BACKEND_PORT ?? "5000";
const BACKEND_HEALTHCHECK = `http://localhost:${BACKEND_PORT}/health`;
const BACKEND_BASE_URL = `http://localhost:${BACKEND_PORT}`;
const DATA_DIR = getBaseDir(process.env.TALLY_HELPER_DATA_DIR);
const PRODUCTION_RENDERER_CANDIDATES = [
  path.join(APP_PATH, "client", "dist", "index.html"),
  path.join(APP_PATH, "renderer", "index.html"),
  path.resolve(__dirname, "..", "client", "dist", "index.html"),
  path.resolve(__dirname, "renderer", "index.html"),
];

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;
let isQuitting = false;
let ipcHandlersRegistered = false;
let autoUpdateInitialized = false;

const getDevServerPort = () => {
  try {
    const { port } = new URL(DEV_SERVER_URL);
    return port || "5173";
  } catch {
    return "5173";
  }
};

const startFrontendDevServer = () => {
  if (!isDevLike || frontendProcess) {
    return frontendProcess;
  }

  const clientDir = path.resolve(__dirname, "..", "client");
  const viteBin = path.resolve(
    clientDir,
    "node_modules",
    "vite",
    "bin",
    "vite.js",
  );

  if (!fs.existsSync(viteBin)) {
    console.warn(
      "[frontend] Vite binary not found. Run `cd client && npm install` first.",
    );
    return null;
  }

  const port = getDevServerPort();
  const args = [
    viteBin,
    "--host",
    "localhost",
    "--port",
    port,
    "--strictPort",
  ];

  frontendProcess = spawn(process.execPath, args, {
    cwd: clientDir,
    env: {
      ...process.env,
      BROWSER: "none",
    },
    stdio: "pipe",
  });

  const logStream = (stream, prefix) => {
    if (!stream) return;
    stream.on("data", (chunk) => {
      const message = chunk.toString().trim();
      if (message) {
        console.log(`[frontend:${prefix}]`, message);
      }
    });
  };

  logStream(frontendProcess.stdout, "stdout");
  logStream(frontendProcess.stderr, "stderr");

  frontendProcess.once("exit", (code, signal) => {
    console.warn(
      `Frontend dev server exited (code: ${code ?? "unknown"}, signal: ${
        signal ?? "n/a"
      })`,
    );
    frontendProcess = null;
  });

  frontendProcess.once("error", (error) => {
    console.error("Failed to start frontend dev server:", error);
  });

  return frontendProcess;
};

const stopFrontendDevServer = () => {
  if (frontendProcess && !frontendProcess.killed) {
    frontendProcess.kill();
  }
  frontendProcess = null;
};

const waitForDevServer = async (attempts = 40, delayMs = 250) => {
  if (isDevLike) {
    startFrontendDevServer();
  }
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(DEV_SERVER_URL, {
        method: "HEAD",
        cache: "no-store",
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // swallow and retry
    }
    await delay(delayMs);
  }
  return false;
};

const findProductionRenderer = () =>
  PRODUCTION_RENDERER_CANDIDATES.find((candidate) => fs.existsSync(candidate));

const resolveRendererTarget = async () => {
  const devServerAvailable = await waitForDevServer();
  const shouldUseDevServer = (baseEnvIsDev || devServerAvailable) && devServerAvailable;

  if (shouldUseDevServer) {
    return { type: "url", value: DEV_SERVER_URL };
  }

  const productionHtml = findProductionRenderer();
  if (productionHtml) {
    return { type: "file", value: productionHtml };
  }

  throw new Error(
    `No renderer entry found. Checked dev server at ${DEV_SERVER_URL} and build artifacts at ${PRODUCTION_RENDERER_CANDIDATES.join(
      ", ",
    )}.`,
  );
};

const loadRenderer = async (windowInstance) => {
  const target = await resolveRendererTarget();
  if (target.type === "url") {
    await windowInstance.loadURL(target.value);
  } else {
    await windowInstance.loadFile(target.value);
  }
};

const createMainWindow = async () => {
  const preloadPath = app.isPackaged
    ? path.join(__dirname, "preload.js")
    : path.resolve(__dirname, "preload.js");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#0C0C0C",
    title: "ImportEase",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const label = ["log", "warn", "error"][level] || "log";
    console[label](
      `[renderer] ${message}${sourceId ? ` (${sourceId}:${line ?? "?"})` : ""}`,
    );
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(
      "[renderer] Failed to load URL",
      validatedURL,
      errorCode,
      errorDescription,
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });

  try {
    await loadRenderer(mainWindow);
  } catch (error) {
    console.error("Unable to load renderer:", error);
    const guidance = isDevLike
      ? "Ensure the client dev server is running (npm run dev:client)."
      : "Build the client (npm run dist) before launching.";
    dialog.showErrorBox(
      "Renderer Failed To Load",
      `${error.message ?? String(error)}\n\n${guidance}`,
    );
  }
};

const startBackend = () => {
  if (backendProcess) {
    return backendProcess;
  }

  // In packaged apps with asar, backend is unpacked to app.asar.unpacked
  // Try unpacked location first, then fall back to app path
  let backendEntry;
  if (app.isPackaged && APP_PATH.endsWith(".asar")) {
    // Backend is unpacked to app.asar.unpacked/backend/server.js
    const unpackedPath = APP_PATH.replace(".asar", ".asar.unpacked");
    const unpackedBackend = path.join(unpackedPath, "backend", "server.js");
    console.log("[backend] Checking unpacked location:", unpackedBackend);
    if (fs.existsSync(unpackedBackend)) {
      backendEntry = unpackedBackend;
      console.log("[backend] Using unpacked backend:", backendEntry);
    } else {
      backendEntry = path.join(APP_PATH, "backend", "server.js");
      console.log("[backend] Unpacked not found, trying asar:", backendEntry);
    }
  } else {
    // Development or non-asar build
    backendEntry = path.join(APP_PATH, "backend", "server.js");
    console.log("[backend] Using app path backend:", backendEntry);
  }

  const backendCwd = path.dirname(backendEntry);
  
  // Verify backend file exists
  if (!fs.existsSync(backendEntry)) {
    const error = new Error(`Backend entry not found: ${backendEntry}`);
    console.error("[backend] Backend file not found:", backendEntry);
    console.error("[backend] APP_PATH:", APP_PATH);
    console.error("[backend] isPackaged:", app.isPackaged);
    dialog.showErrorBox(
      "Backend Startup Error",
      `Backend server file not found.\n\nExpected: ${backendEntry}\n\nPlease rebuild the application.`,
    );
    throw error;
  }
  
  console.log("[backend] Starting backend from:", backendEntry);
  
  // Use Electron executable as Node.js with ELECTRON_RUN_AS_NODE flag
  const nodeBinary = process.execPath;

  backendProcess = spawn(nodeBinary, [backendEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: BACKEND_PORT,
      TALLY_HELPER_DATA_DIR: DATA_DIR,
      NODE_ENV: "production",
    },
    cwd: backendCwd,
    stdio: "pipe",
  });

  const logStream = (stream, prefix) => {
    if (!stream) return;
    stream.on("data", (chunk) => {
      const message = chunk.toString().trim();
      if (message) {
        console[prefix === "stderr" ? "error" : "log"](
          `[backend:${prefix}]`,
          message,
        );
      }
    });
  };

  if (isDevLike) {
    logStream(backendProcess.stdout, "stdout");
    logStream(backendProcess.stderr, "stderr");
  } else {
    backendProcess.stdout?.resume();
    backendProcess.stderr?.resume();
  }

  backendProcess.once("error", (error) => {
    console.error("Backend failed to start:", error);
    dialog.showErrorBox(
      "Backend Startup Error",
      `The backend server could not be started.\n${error.message}`,
    );
  });

  backendProcess.once("exit", (code, signal) => {
    console.warn(
      `Backend exited (code: ${code ?? "unknown"}, signal: ${signal ?? "n/a"})`,
    );
    backendProcess = null;
    if (!isQuitting) {
      dialog.showErrorBox(
        "Backend Exited Unexpectedly",
        "The backend server stopped running. Restart the app to recover.",
      );
    }
  });

  return backendProcess;
};

const stopBackend = () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  backendProcess = null;
};

const waitForBackend = async (attempts = 40, delayMs = 500) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(BACKEND_HEALTHCHECK, { cache: "no-store" });
      if (response.ok) {
        return true;
      }
    } catch (error) {
      if (attempt === attempts - 1) {
        throw error;
      }
    }
    await delay(delayMs);
  }
  throw new Error("Backend health check timed out");
};

const registerIpcHandlers = () => {
  if (ipcHandlersRegistered) {
    return;
  }

  ipcMain.handle("ping", () => "pong");

   ipcMain.handle("get-device-id", async () => {
    try {
      const deviceFile = path.join(DATA_DIR, "auth", "device.json");
      if (fs.existsSync(deviceFile)) {
        const raw = fs.readFileSync(deviceFile, "utf8");
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed?.deviceId) {
            return parsed.deviceId;
          }
        }
      }

      const baseId = machineIdSync(true);
      const hash = crypto
        .createHash("sha256")
        .update(baseId)
        .digest("hex");
      const deviceId = `DEV-${hash}`;

      const dir = path.dirname(deviceFile);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        deviceFile,
        JSON.stringify({ deviceId }, null, 2),
        "utf8",
      );

      return deviceId;
    } catch (error) {
      console.error("[ipc] get-device-id failed:", error);
      throw error;
    }
  });

  ipcMain.handle("read-json", async (_, filename) => {
    try {
      if (!filename) {
        return null;
      }

      const filePath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const raw = fs.readFileSync(filePath, "utf8");
      if (!raw.trim()) {
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.error("[ipc] read-json failed:", error);
      return {
        error: "READ_JSON_FAILED",
        message: error.message,
      };
    }
  });

  ipcMain.handle("write-json", async (_, filename, data) => {
    try {
      if (!filename) {
        throw new Error("A filename is required.");
      }

      const filePath = path.join(DATA_DIR, filename);
      const directory = path.dirname(filePath);
      fs.mkdirSync(directory, { recursive: true });

      fs.writeFileSync(filePath, JSON.stringify(data ?? {}, null, 2), "utf8");
      return { ok: true };
    } catch (error) {
      console.error("[ipc] write-json failed:", error);
      return {
        error: "WRITE_JSON_FAILED",
        message: error.message,
      };
    }
  });

  ipcMain.handle("proxy-api", async (_, payload = {}) => {
    const apiPath = payload.path ?? "/";
    const options = payload.options ?? {};

    try {
      const targetUrl = new URL(apiPath, `${BACKEND_BASE_URL}/`).toString();

      const fetchOptions = {
        method: options.method ?? "GET",
        headers: options.headers ?? {},
        body: options.body,
      };

      if (
        fetchOptions.body &&
        typeof fetchOptions.body === "object" &&
        !(fetchOptions.body instanceof Buffer)
      ) {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
        fetchOptions.headers = {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        };
      }

      const response = await fetch(targetUrl, fetchOptions);
      const text = await response.text();
      let json = null;

      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = { raw: text };
        }
      }

      return {
        status: response.status,
        ok: response.ok,
        json,
      };
    } catch (error) {
      console.error("[ipc] proxy-api failed:", error);
      return {
        error: "PROXY_API_FAILED",
        message: error.message,
      };
    }
  });

  ipcHandlersRegistered = true;
};

const initAutoUpdater = () => {
  if (autoUpdateInitialized) return;
  autoUpdateInitialized = true;

  if (!app.isPackaged || isDevLike) {
    console.log("[updater] Skipping auto-update in development.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on("error", (error) => {
    console.error("[updater] Error:", error);
  });

  autoUpdater.on("update-available", (info) => {
    console.log("[updater] Update available:", info?.version ?? "unknown version");
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] No updates available.");
  });

  autoUpdater.on("update-downloaded", async (_event, _notes, releaseName) => {
    try {
      if (!mainWindow) return;
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: "question",
        buttons: ["Install now", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update available",
        message: `A new version of Tally Helper (${releaseName}) has been downloaded.`,
        detail:
          "Install now to update to the latest version. The application will restart during the update.",
      });

      if (response === 0) {
        isQuitting = true;
        setImmediate(() => {
          autoUpdater.quitAndInstall();
        });
      }
    } catch (error) {
      console.error("[updater] Failed to prompt for update:", error);
    }
  });

  // Check for updates a few seconds after startup to allow network to come up.
  setTimeout(() => {
    autoUpdater
      .checkForUpdates()
      .then(() => {
        console.log("[updater] Update check initiated.");
      })
      .catch((error) => {
        console.error("[updater] Failed to check for updates:", error);
      });
  }, 8000);
};

const bootstrap = async () => {
  const dataDir = await ensurePreferredDataDir();
  setBaseDir(dataDir);
  process.env.TALLY_HELPER_DATA_DIR = dataDir;
  registerIpcHandlers();
  startBackend();
  try {
    await waitForBackend();
  } catch (error) {
    console.error("Backend health check failed:", error);
    dialog.showErrorBox(
      "Backend Not Reachable",
      `The backend did not respond at ${BACKEND_HEALTHCHECK}.`,
    );
  }
  await createMainWindow();
  initAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
};

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
  stopFrontendDevServer();
});

