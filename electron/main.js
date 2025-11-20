import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseEnvIsDev = process.env.NODE_ENV !== "production";
const isDevLike = baseEnvIsDev || !app.isPackaged;
const DEV_SERVER_URL =
  process.env.VITE_DEV_SERVER_URL ??
  process.env.FRONTEND_DEV_SERVER ??
  "http://localhost:5173";
const BACKEND_PORT = process.env.BACKEND_PORT ?? "5000";
const BACKEND_HEALTHCHECK = `http://localhost:${BACKEND_PORT}/health`;
const BACKEND_BASE_URL = `http://localhost:${BACKEND_PORT}`;
const PRODUCTION_RENDERER_CANDIDATES = [
  path.resolve(__dirname, "..", "client", "dist", "index.html"),
  path.resolve(__dirname, "..", "renderer", "build", "index.html"),
];

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;
let isQuitting = false;
let ipcHandlersRegistered = false;

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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: "#0C0C0C",
    title: "Tally Helper",
    webPreferences: {
      preload: path.resolve(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
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

  const backendEntry = path.resolve(__dirname, "..", "backend", "server.js");
  const backendCwd = path.dirname(backendEntry);
  const nodeBinary = process.env.BACKEND_NODE ?? process.execPath;

  backendProcess = spawn(nodeBinary, [backendEntry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: BACKEND_PORT,
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

  const resolveStoragePath = (filename) => {
    if (!filename || typeof filename !== "string") {
      throw new Error("A filename string is required.");
    }
    return path.join(app.getPath("userData"), filename);
  };

  ipcMain.handle("ping", () => "pong");

  ipcMain.handle("read-json", async (_, filename) => {
    try {
      if (!filename) {
        return null;
      }

      const filePath = resolveStoragePath(filename);
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

      const filePath = resolveStoragePath(filename);
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

const bootstrap = async () => {
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

