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
      console.error(`[accountingStore] Task failed for ${key}:`, error);
    }),
  );
  return run.finally(() => {
    if (locks.get(key) === run) {
      locks.delete(key);
    }
  });
};

const getCompanyAccountingPath = (companyId, filename) => {
  const baseDir = getBaseDir();
  return path.join(
    baseDir,
    "companies",
    companyId,
    "accounting",
    filename
  );
};

const ensureCompanyAccountingDir = async (companyId, subdir = "") => {
  const baseDir = getBaseDir();
  const dirPath = subdir
    ? path.join(baseDir, "companies", companyId, "accounting", subdir)
    : path.join(baseDir, "companies", companyId, "accounting");
  await fsPromises.mkdir(dirPath, { recursive: true });
  return dirPath;
};

const readAccountingFile = async (companyId, filename, defaultValue = []) => {
  const fullPath = getCompanyAccountingPath(companyId, filename);
  await ensureCompanyAccountingDir(companyId);

  try {
    await fsPromises.access(fullPath, fs.constants.F_OK);
    const raw = await fsPromises.readFile(fullPath, "utf8");
    if (!raw.trim()) {
      return Array.isArray(defaultValue) ? [...defaultValue] : { ...defaultValue };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 0 && typeof defaultValue === "object" && !Array.isArray(defaultValue)) {
      return { ...defaultValue };
    }
    return parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
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

const writeAccountingFile = async (companyId, filename, data) => {
  const fullPath = getCompanyAccountingPath(companyId, filename);
  await ensureCompanyAccountingDir(companyId);
  await fsPromises.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
  return data;
};

const appendToAccountingFile = async (companyId, filename, newRows) => {
  const fullPath = getCompanyAccountingPath(companyId, filename);
  await ensureCompanyAccountingDir(companyId);

  try {
    await fsPromises.access(fullPath, fs.constants.F_OK);
    const raw = await fsPromises.readFile(fullPath, "utf8");
    const existing = raw.trim() ? JSON.parse(raw) : [];
    const updated = [...existing, ...(Array.isArray(newRows) ? newRows : [newRows])];
    await fsPromises.writeFile(fullPath, JSON.stringify(updated, null, 2), "utf8");
    return updated;
  } catch (error) {
    if (error.code === "ENOENT") {
      const data = Array.isArray(newRows) ? newRows : [newRows];
      await fsPromises.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
      return data;
    }
    throw error;
  }
};

export const readAccountingCollection = (companyId, collectionName, subdir = "masters") => {
  const filename = subdir ? `${subdir}/${collectionName}.json` : `${collectionName}.json`;
  return withLock(`${companyId}:${collectionName}`, () =>
    readAccountingFile(companyId, filename, [])
  );
};

export const writeAccountingCollection = (companyId, collectionName, data, subdir = "masters") => {
  const filename = subdir ? `${subdir}/${collectionName}.json` : `${collectionName}.json`;
  return withLock(`${companyId}:${collectionName}`, () =>
    writeAccountingFile(companyId, filename, data)
  );
};

export const mutateAccountingCollection = (companyId, collectionName, mutator, subdir = "masters") => {
  return withLock(`${companyId}:${collectionName}`, async () => {
    const filename = subdir ? `${subdir}/${collectionName}.json` : `${collectionName}.json`;
    const current = await readAccountingFile(companyId, filename, []);
    const outcome = (await mutator(current)) || {};
    if (outcome.skipWrite) {
      return outcome.result;
    }
    const nextData =
      outcome.nextData !== undefined ? outcome.nextData : current;
    await writeAccountingFile(companyId, filename, nextData);
    return outcome.result ?? nextData;
  });
};

export const appendAccountingVoucher = async (companyId, voucherType, voucher) => {
  const filename = `vouchers/${voucherType}.json`;
  return withLock(`${companyId}:${voucherType}`, () =>
    appendToAccountingFile(companyId, filename, voucher)
  );
};

// Export file-level functions
export { readAccountingFile, writeAccountingFile, appendToAccountingFile, getCompanyAccountingPath, ensureCompanyAccountingDir };

