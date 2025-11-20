import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const STORAGE_SUBDIR = "TallyHelperData";
let cachedElectronApp = null;

const getElectronApp = () => {
  if (cachedElectronApp !== null) {
    return cachedElectronApp;
  }

  try {
    const { app } = require("electron");
    cachedElectronApp = app ?? undefined;
  } catch {
    cachedElectronApp = undefined;
  }

  return cachedElectronApp;
};

const getBaseDir = (customBasePath) => {
  if (customBasePath) {
    return customBasePath;
  }

  const electronApp = getElectronApp();
  if (electronApp?.getPath) {
    return path.join(electronApp.getPath("userData"), STORAGE_SUBDIR);
  }

  const platform = process.platform;
  const home = process.env.HOME || process.env.USERPROFILE || ".";

  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, "TallyHelper", STORAGE_SUBDIR);
  }

  if (platform === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "TallyHelper",
      STORAGE_SUBDIR,
    );
  }

  if (platform === "linux") {
    return path.join(home, ".config", "TallyHelper", STORAGE_SUBDIR);
  }

  return path.join(home, "TallyHelper", STORAGE_SUBDIR);
};

export const getFullPath = (filename, basePath) => {
  if (!filename || typeof filename !== "string") {
    throw new Error("A filename string is required.");
  }
  return path.join(getBaseDir(basePath), filename);
};

export const ensureDataDir = async (basePath) => {
  const dir = getBaseDir(basePath);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const readJson = async (
  filename,
  { basePath, defaultToObject = false } = {},
) => {
  const fullPath = getFullPath(filename, basePath);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    if (!raw.trim()) {
      return defaultToObject ? {} : [];
    }
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return defaultToObject ? {} : [];
    }

    console.error(`[fileService] Failed to read ${fullPath}:`, error);
    throw error;
  }
};

export const writeJson = async (filename, data, { basePath } = {}) => {
  const fullPath = getFullPath(filename, basePath);
  await ensureDataDir(basePath);
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
  return true;
};

