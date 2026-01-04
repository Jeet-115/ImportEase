import { v4 as uuidv4 } from "uuid";
import {
  mutateCollection,
  readCollection,
} from "../storage/fileStore.js";

const COLLECTION_KEY = "salesLedgerMasters";

export const findAll = async () => readCollection(COLLECTION_KEY);

export const findById = async (id) => {
  const ledgers = await readCollection(COLLECTION_KEY);
  return ledgers.find((ledger) => ledger._id === id) || null;
};

export const create = async (payload) =>
  mutateCollection(COLLECTION_KEY, (ledgers) => {
    const now = new Date().toISOString();
    const record = {
      _id: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...ledgers, record], result: record };
  });

export const updateById = async (id, updates) =>
  mutateCollection(COLLECTION_KEY, (ledgers) => {
    const index = ledgers.findIndex((ledger) => ledger._id === id);
    if (index === -1) {
      return { nextData: ledgers, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...ledgers[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...ledgers];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (id) =>
  mutateCollection(COLLECTION_KEY, (ledgers) => {
    const nextData = ledgers.filter((ledger) => ledger._id !== id);
    const removed = ledgers.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });
