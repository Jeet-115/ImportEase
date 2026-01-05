import { v4 as uuidv4 } from "uuid";
import {
  mutateAccountingCollection,
  readAccountingCollection,
} from "../../storage/accountingStore.js";

const COLLECTION_NAME = "scenarios";

export const findAll = async (companyId) =>
  readAccountingCollection(companyId, COLLECTION_NAME);

export const findById = async (companyId, scenarioId) => {
  const scenarios = await readAccountingCollection(companyId, COLLECTION_NAME);
  return scenarios.find((s) => s.id === scenarioId) || null;
};

export const create = async (companyId, payload) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (scenarios) => {
    const now = new Date().toISOString();
    const scenario = {
      id: uuidv4(),
      name: payload.name,
      description: payload.description || "",
      vouchers: payload.vouchers || [], // Array of provisional voucher IDs
      isActive: payload.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...scenarios, scenario], result: scenario };
  });

export const updateById = async (companyId, scenarioId, updates) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (scenarios) => {
    const index = scenarios.findIndex((s) => s.id === scenarioId);
    if (index === -1) {
      return { nextData: scenarios, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...scenarios[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...scenarios];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, scenarioId) =>
  mutateAccountingCollection(companyId, COLLECTION_NAME, (scenarios) => {
    const nextData = scenarios.filter((s) => s.id !== scenarioId);
    const removed = scenarios.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });


