import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateProcessedLedgerNames } from "../services/gstr2bservice";

const defaultRowKeyFn = (row, index) =>
  String(row?._id ?? row?.slNo ?? index ?? 0);

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") return value;
  return String(value);
};

const trimOrNull = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

const useLedgerNameEditing = ({
  rows = [],
  importId,
  getRowKey = defaultRowKeyFn,
  onUpdated,
}) => {
  const [inputs, setInputs] = useState({});
  const [dirtyRows, setDirtyRows] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [savedMap, setSavedMap] = useState({});
  const savedMapRef = useRef(savedMap);

  const rowMeta = useMemo(() => {
    const meta = {};
    rows.forEach((row, idx) => {
      meta[getRowKey(row, idx)] = {
        slNo:
          row?.slNo !== undefined && row?.slNo !== null
            ? row.slNo
            : undefined,
        index: idx,
      };
    });
    return meta;
  }, [rows, getRowKey]);

  useEffect(() => {
    const initialInputs = {};
    rows.forEach((row, idx) => {
      initialInputs[getRowKey(row, idx)] = normalizeValue(row?.["Ledger Name"] ?? "");
    });
    setInputs(initialInputs);
    setSavedMap(initialInputs);
    savedMapRef.current = initialInputs;
    setDirtyRows(new Set());
  }, [rows, getRowKey]);

  useEffect(() => {
    savedMapRef.current = savedMap;
  }, [savedMap]);

  const handleChange = useCallback((rowKey, value) => {
    setInputs((prev) => ({
      ...prev,
      [rowKey]: value,
    }));
    setDirtyRows((prev) => {
      const next = new Set(prev);
      const savedValue = normalizeValue(savedMapRef.current[rowKey] ?? "");
      if (normalizeValue(value ?? "") === savedValue) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  }, []);

  const persistChanges = useCallback(async () => {
    if (!dirtyRows.size || !importId) {
      return null;
    }
    const payloadRows = Array.from(dirtyRows)
      .map((rowKey) => {
        const meta = rowMeta[rowKey];
        if (!meta) return null;
        return {
          slNo: meta.slNo,
          index: meta.index,
          ledgerName: trimOrNull(inputs[rowKey]),
        };
      })
      .filter(Boolean);

    if (!payloadRows.length) {
      setDirtyRows(new Set());
      return null;
    }

    setSaving(true);
    try {
      const { data } = await updateProcessedLedgerNames(importId, {
        rows: payloadRows,
      });
      const processed = data?.processed || null;
      if (processed) {
        onUpdated?.(processed);
      }
      const nextRows = processed?.processedRows || rows;
      const refreshedInputs = {};
      nextRows.forEach((row, idx) => {
        refreshedInputs[getRowKey(row, idx)] = normalizeValue(
          row?.["Ledger Name"] ?? ""
        );
      });
      setInputs(refreshedInputs);
      setSavedMap(refreshedInputs);
      savedMapRef.current = refreshedInputs;
      setDirtyRows(new Set());
      return processed;
    } finally {
      setSaving(false);
    }
  }, [dirtyRows, importId, inputs, onUpdated, rowMeta, rows, getRowKey]);

  return {
    ledgerInputs: inputs,
    handleLedgerInputChange: handleChange,
    dirtyCount: dirtyRows.size,
    persistLedgerChanges: persistChanges,
    savingLedgerChanges: saving,
  };
};

export default useLedgerNameEditing;

