import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import {
  getBaseDir,
} from "../../fileService.js";

const locks = new Map();

const withLock = (key, task) => {
  const previous = locks.get(key) || Promise.resolve();
  const run = previous.then(() => task());
  locks.set(
    key,
    run.catch((error) => {
      console.error(`[inventoryLedgerStore] Task failed for ${key}:`, error);
    }),
  );
  return run.finally(() => {
    if (locks.get(key) === run) {
      locks.delete(key);
    }
  });
};

const getCompanyInventoryLedgerPath = (companyId, filename) => {
  const baseDir = getBaseDir();
  return path.join(
    baseDir,
    "companies",
    companyId,
    "inventory",
    "ledger",
    filename
  );
};

const ensureCompanyInventoryLedgerDir = async (companyId) => {
  const baseDir = getBaseDir();
  const ledgerDir = path.join(
    baseDir,
    "companies",
    companyId,
    "inventory",
    "ledger"
  );
  await fsPromises.mkdir(ledgerDir, { recursive: true });
  return ledgerDir;
};

const readLedgerFile = async (companyId, filename, defaultValue = []) => {
  const fullPath = getCompanyInventoryLedgerPath(companyId, filename);
  await ensureCompanyInventoryLedgerDir(companyId);

  try {
    await fsPromises.access(fullPath, fs.constants.F_OK);
    const raw = await fsPromises.readFile(fullPath, "utf8");
    if (!raw.trim()) {
      return Array.isArray(defaultValue) ? [...defaultValue] : { ...defaultValue };
    }
    return JSON.parse(raw);
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

const writeLedgerFile = async (companyId, filename, data) => {
  const fullPath = getCompanyInventoryLedgerPath(companyId, filename);
  await ensureCompanyInventoryLedgerDir(companyId);
  await fsPromises.writeFile(fullPath, JSON.stringify(data, null, 2), "utf8");
  return data;
};

const appendToLedgerFile = async (companyId, filename, newRows) => {
  const fullPath = getCompanyInventoryLedgerPath(companyId, filename);
  await ensureCompanyInventoryLedgerDir(companyId);

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

// Inventory Transactions (THE ONLY SOURCE OF STOCK)
export const readInventoryTransactions = (companyId) => {
  return withLock(`${companyId}:transactions`, () =>
    readLedgerFile(companyId, "inventoryTransactions.json", [])
  );
};

export const appendInventoryTransaction = (companyId, transaction) => {
  return withLock(`${companyId}:transactions`, () =>
    appendToLedgerFile(companyId, "inventoryTransactions.json", transaction)
  );
};

export const appendInventoryTransactions = (companyId, transactions) => {
  return withLock(`${companyId}:transactions`, () =>
    appendToLedgerFile(companyId, "inventoryTransactions.json", transactions)
  );
};

// Voucher files (UI & accounting data only, no stock movement)
export const readVoucherFile = (companyId, voucherType) => {
  const filename = `${voucherType}.json`;
  return withLock(`${companyId}:${voucherType}`, () =>
    readLedgerFile(companyId, filename, [])
  );
};

export const appendVoucher = (companyId, voucherType, voucher) => {
  const filename = `${voucherType}.json`;
  return withLock(`${companyId}:${voucherType}`, () =>
    appendToLedgerFile(companyId, filename, voucher)
  );
};

// Tracking Numbers
export const readTrackingNumbers = (companyId) => {
  return withLock(`${companyId}:tracking`, () =>
    readLedgerFile(companyId, "tracking.json", [])
  );
};

export const appendTrackingNumber = (companyId, tracking) => {
  return withLock(`${companyId}:tracking`, () =>
    appendToLedgerFile(companyId, "tracking.json", tracking)
  );
};

export const updateTrackingNumber = async (companyId, trackingNo, updates) => {
  return withLock(`${companyId}:tracking`, async () => {
    const trackings = await readLedgerFile(companyId, "tracking.json", []);
    const index = trackings.findIndex((t) => t.trackingNo === trackingNo);
    if (index === -1) {
      throw new Error(`Tracking number ${trackingNo} not found`);
    }
    const updated = [...trackings];
    updated[index] = { ...updated[index], ...updates };
    await writeLedgerFile(companyId, "tracking.json", updated);
    return updated[index];
  });
};

export { readLedgerFile, writeLedgerFile };

