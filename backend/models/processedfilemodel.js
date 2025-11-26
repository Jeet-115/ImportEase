import {
  mutateCollection,
  readCollection,
} from "../storage/fileStore.js";

const COLLECTION_KEY = "processedFiles";

const DISALLOW_LEDGER_NAMES = [
  "Penalty [disallow]",
  "Repair of Vehicle [disallow]",
  "Insurance of Vehicle [disallow]",
  "Festival Exp. [disallow]",
];

const DISALLOW_LEDGER_SET = new Set(
  DISALLOW_LEDGER_NAMES.map((name) => name.toLowerCase())
);

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

const isDisallowLedger = (ledgerName) => {
  if (!ledgerName) return false;
  return DISALLOW_LEDGER_SET.has(String(ledgerName).trim().toLowerCase());
};

const renumberRows = (rows = []) =>
  rows.map((row, idx) => ({
    ...row,
    slNo: idx + 1,
  }));

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
    const disallowRows = Array.isArray(target.disallowRows)
      ? target.disallowRows
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

    const disallowCandidates = [];
    const remainingProcessedRows = [];

    nextRows.forEach((row) => {
      const ledgerName = normalizeLedgerName(row?.["Ledger Name"]);
      if (isDisallowLedger(ledgerName)) {
        disallowCandidates.push(row);
      } else {
        remainingProcessedRows.push(row);
      }
    });

    const mergedDisallowRows = renumberRows([
      ...disallowRows,
      ...disallowCandidates,
    ]);
    const normalizedProcessedRows = renumberRows(remainingProcessedRows);

    const updated = {
      ...target,
      processedRows: normalizedProcessedRows,
      disallowRows: mergedDisallowRows,
      updatedAt: new Date().toISOString(),
    };

    const nextData = [...entries];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const updateReverseChargeLedgerNames = async (id, rows = []) =>
  mutateCollection(COLLECTION_KEY, (entries) => {
    const index = entries.findIndex((entry) => entry._id === id);
    if (index === -1) {
      return { nextData: entries, result: null, skipWrite: true };
    }

    const target = entries[index] || {};
    const reverseChargeRows = Array.isArray(target.reverseChargeRows)
      ? target.reverseChargeRows
      : [];

    if (!reverseChargeRows.length) {
      console.warn(`No reverse charge rows found for document ${id}. Cannot update ledger names.`);
      return { nextData: entries, result: target, skipWrite: true };
    }

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
      console.warn(`No matching rows found for reverse charge ledger name update. Payload rows:`, rows);
      return { nextData: entries, result: target, skipWrite: true };
    }

    const nextRows = reverseChargeRows.map((row, idx) => {
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
    
    // Verify that at least one row was updated
    const hasChanges = nextRows.some((row, idx) => {
      const original = reverseChargeRows[idx];
      return original?.["Ledger Name"] !== row?.["Ledger Name"];
    });
    
    if (!hasChanges) {
      console.warn("No changes detected in reverse charge rows after update attempt.");
      return { nextData: entries, result: target, skipWrite: true };
    }

    const updated = {
      ...target,
      reverseChargeRows: nextRows,
      updatedAt: new Date().toISOString(),
    };

    const nextData = [...entries];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

