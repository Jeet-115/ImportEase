import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import {
  ensureDataDir as ensureElectronDataDir,
  getBaseDir,
} from "../../fileService.js";

const locks = new Map();

const withLock = (key, task) => {
  const previous = locks.get(key) || Promise.resolve();
  const run = previous.then(() => task());
  locks.set(
    key,
    run.catch((error) => {
      console.error(`[inventoryStore] Task failed for ${key}:`, error);
    }),
  );
  return run.finally(() => {
    if (locks.get(key) === run) {
      locks.delete(key);
    }
  });
};

const getCompanyInventoryPath = (companyId, filename) => {
  const baseDir = getBaseDir();
  return path.join(
    baseDir,
    "companies",
    companyId,
    "inventory",
    filename
  );
};

const ensureCompanyInventoryDir = async (companyId) => {
  const baseDir = getBaseDir();
  const companyDir = path.join(
    baseDir,
    "companies",
    companyId,
    "inventory"
  );
  await fsPromises.mkdir(companyDir, { recursive: true });
  return companyDir;
};

const readInventoryFile = async (companyId, filename, defaultValue = []) => {
  const fullPath = getCompanyInventoryPath(companyId, filename);
  await ensureCompanyInventoryDir(companyId);

  try {
    await fsPromises.access(fullPath, fs.constants.F_OK);
    const raw = await fsPromises.readFile(fullPath, "utf8");
    if (!raw.trim()) {
      return Array.isArray(defaultValue) ? [...defaultValue] : { ...defaultValue };
    }
    const parsed = JSON.parse(raw);
    // If file exists but is empty array and we expect an object, return default object
    if (Array.isArray(parsed) && parsed.length === 0 && typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
      return { ...defaultValue };
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      // File doesn't exist, create it with default value
      const defaultData = Array.isArray(defaultValue)
        ? [...defaultValue]
        : { ...defaultValue };
      await fsPromises.writeFile(
        fullPath,
        JSON.stringify(defaultData, null, 2),
        "utf8"
      );
      return defaultData;
    }
    throw error;
  }
};

const writeInventoryFile = async (companyId, filename, data) => {
  const fullPath = getCompanyInventoryPath(companyId, filename);
  await ensureCompanyInventoryDir(companyId);
  await fsPromises.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
  return data;
};

export const readInventoryCollection = (companyId, collectionName) => {
  const filename = `${collectionName}.json`;
  return withLock(`${companyId}:${collectionName}`, () =>
    readInventoryFile(companyId, filename, [])
  );
};

export const writeInventoryCollection = (companyId, collectionName, data) => {
  const filename = `${collectionName}.json`;
  return withLock(`${companyId}:${collectionName}`, () =>
    writeInventoryFile(companyId, filename, data)
  );
};

export const mutateInventoryCollection = (companyId, collectionName, mutator) => {
  return withLock(`${companyId}:${collectionName}`, async () => {
    const current = await readInventoryFile(companyId, `${collectionName}.json`, []);
    const outcome = (await mutator(current)) || {};
    if (outcome.skipWrite) {
      return outcome.result;
    }
    const nextData =
      outcome.nextData !== undefined ? outcome.nextData : current;
    await writeInventoryFile(companyId, `${collectionName}.json`, nextData);
    return outcome.result ?? nextData;
  });
};

// Export file-level functions for special cases (like features.json which is an object, not array)
export { readInventoryFile, writeInventoryFile, getCompanyInventoryPath, ensureCompanyInventoryDir };

