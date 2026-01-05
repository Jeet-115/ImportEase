import { v4 as uuidv4 } from "uuid";
import {
  mutateAccountingCollection,
  readAccountingCollection,
} from "../../storage/accountingStore.js";

const COLLECTION_NAME = "ledgers";

export const findAll = async (companyId) =>
  readAccountingCollection(companyId, COLLECTION_NAME);

export const findById = async (companyId, id) => {
  const ledgers = await readAccountingCollection(companyId, COLLECTION_NAME);
  return ledgers.find((ledger) => ledger.id === id) || null;
};

export const create = async (companyId, payload) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (ledgers) => {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...payload,
      // Default Phase-5 fields
      inventoryAffectsStock: payload.inventoryAffectsStock ?? false,
      gstRate: payload.gstRate ?? 0,
      gstType: payload.gstType ?? "",
      roundingType: payload.roundingType ?? "NONE",
      isDiscountLedger: payload.isDiscountLedger ?? false,
      isFreightLedger: payload.isFreightLedger ?? false,
      isInterestLedger: payload.isInterestLedger ?? false,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...ledgers, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (ledgers) => {
    const index = ledgers.findIndex((ledger) => ledger.id === id);
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

export const deleteById = async (companyId, id) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (ledgers) => {
    const nextData = ledgers.filter((ledger) => ledger.id !== id);
    const removed = ledgers.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

