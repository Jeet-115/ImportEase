import {
  mutateCollection,
  readCollection,
} from "../storage/fileStore.js";

const COLLECTION_KEY = "processedFiles";

export const findById = async (id) => {
  const entries = await readCollection(COLLECTION_KEY);
  return entries.find((entry) => entry._id === id) || null;
};

export const upsert = async (payload) =>
  mutateCollection(COLLECTION_KEY, (entries) => {
    if (!payload?._id) {
      throw new Error("Processed file payload must include an _id.");
    }

    const index = entries.findIndex((entry) => entry._id === payload._id);
    const now = new Date().toISOString();
    const record = {
      ...(index >= 0 ? entries[index] : {}),
      ...payload,
      updatedAt: now,
      processedAt: payload.processedAt || now,
    };

    if (index === -1) {
      return {
        nextData: [...entries, record],
        result: record,
      };
    }

    const nextData = [...entries];
    nextData[index] = record;
    return { nextData, result: record };
  });

const normalizeLedgerName = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

export const updateLedgerNames = async (id, rows = []) =>
  mutateCollection(COLLECTION_KEY, (entries) => {
    const index = entries.findIndex((entry) => entry._id === id);
    if (index === -1) {
      return { nextData: entries, result: null, skipWrite: true };
    }

    const target = entries[index] || {};
    const processedRows = Array.isArray(target.processedRows)
      ? target.processedRows
      : [];

    const bySlNo = new Map();
    const byIndex = new Map();

    rows.forEach((row) => {
      if (!row) return;
      const ledgerName = normalizeLedgerName(row.ledgerName);
      if (
        Object.prototype.hasOwnProperty.call(row, "slNo") &&
        row.slNo !== null &&
        row.slNo !== undefined
      ) {
        const slKey = Number(row.slNo);
        if (!Number.isNaN(slKey)) {
          bySlNo.set(slKey, ledgerName);
          return;
        }
      }
      if (
        Object.prototype.hasOwnProperty.call(row, "index") &&
        row.index !== null &&
        row.index !== undefined
      ) {
        const idxKey = Number(row.index);
        if (!Number.isNaN(idxKey)) {
          byIndex.set(idxKey, ledgerName);
        }
      }
    });

    if (!bySlNo.size && !byIndex.size) {
      return { nextData: entries, result: target, skipWrite: true };
    }

    const nextRows = processedRows.map((row, idx) => {
      const slKey = Number(row?.slNo);
      let nextValue;
      if (!Number.isNaN(slKey) && bySlNo.has(slKey)) {
        nextValue = bySlNo.get(slKey);
      } else if (byIndex.has(idx)) {
        nextValue = byIndex.get(idx);
      } else {
        return row;
      }
      return {
        ...row,
        "Ledger Name": nextValue,
      };
    });

    const updated = {
      ...target,
      processedRows: nextRows,
      updatedAt: new Date().toISOString(),
    };

    const nextData = [...entries];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

