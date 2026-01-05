import { v4 as uuidv4 } from "uuid";
import {
  mutateAccountingCollection,
  readAccountingCollection,
} from "../../storage/accountingStore.js";

const COLLECTION_NAME = "budgets";

export const findAll = async (companyId) =>
  readAccountingCollection(companyId, COLLECTION_NAME);

export const findById = async (companyId, budgetId) => {
  const budgets = await readAccountingCollection(companyId, COLLECTION_NAME);
  return budgets.find((b) => b.id === budgetId) || null;
};

export const findByPeriod = async (companyId, period) => {
  const budgets = await readAccountingCollection(companyId, COLLECTION_NAME);
  return budgets.filter((b) => b.period === period);
};

export const create = async (companyId, payload) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (budgets) => {
    const now = new Date().toISOString();
    const budget = {
      id: uuidv4(),
      name: payload.name,
      period: payload.period, // e.g., "2025-04" for April 2025
      type: payload.type, // "GROUP" | "LEDGER" | "COST_CENTRE"
      targetId: payload.targetId, // Group ID, Ledger ID, or Cost Centre ID
      amount: payload.amount,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...budgets, budget], result: budget };
  });

export const updateById = async (companyId, budgetId, updates) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (budgets) => {
    const index = budgets.findIndex((b) => b.id === budgetId);
    if (index === -1) {
      return { nextData: budgets, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...budgets[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...budgets];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, budgetId) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (budgets) => {
    const nextData = budgets.filter((b) => b.id !== budgetId);
    const removed = budgets.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });


