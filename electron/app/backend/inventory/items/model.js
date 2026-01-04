import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "items");

export const findById = async (companyId, id) => {
  const items = await findAll(companyId);
  return items.find((item) => item.id === id) || null;
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "items", (items) => {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...items, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "items", (items) => {
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      return { nextData: items, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...items[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...items];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "items", (items) => {
    const nextData = items.filter((item) => item.id !== id);
    const removed = items.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

