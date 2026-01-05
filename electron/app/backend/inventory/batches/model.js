import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "batches");

export const findById = async (companyId, id) => {
  const batches = await findAll(companyId);
  return batches.find((batch) => batch.batchId === id) || null;
};

export const findByItemId = async (companyId, itemId) => {
  const batches = await findAll(companyId);
  return batches.filter((batch) => batch.itemId === itemId);
};

export const findByBatchNo = async (companyId, batchNo) => {
  const batches = await findAll(companyId);
  return batches.find((batch) => batch.batchNo === batchNo) || null;
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "batches", (batches) => {
    const now = new Date().toISOString();
    const record = {
      batchId: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...batches, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "batches", (batches) => {
    const index = batches.findIndex((batch) => batch.batchId === id);
    if (index === -1) {
      return { nextData: batches, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...batches[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...batches];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "batches", (batches) => {
    const nextData = batches.filter((batch) => batch.batchId !== id);
    const removed = batches.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

