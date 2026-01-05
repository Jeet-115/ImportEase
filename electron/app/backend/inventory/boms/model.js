import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "boms");

export const findById = async (companyId, id) => {
  const boms = await findAll(companyId);
  return boms.find((bom) => bom.bomId === id) || null;
};

export const findByItemId = async (companyId, itemId) => {
  const boms = await findAll(companyId);
  return boms.filter((bom) => bom.itemId === itemId);
};

export const findByType = async (companyId, type) => {
  const boms = await findAll(companyId);
  return boms.filter((bom) => bom.type === type);
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "boms", (boms) => {
    const now = new Date().toISOString();
    const record = {
      bomId: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...boms, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "boms", (boms) => {
    const index = boms.findIndex((bom) => bom.bomId === id);
    if (index === -1) {
      return { nextData: boms, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...boms[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...boms];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "boms", (boms) => {
    const nextData = boms.filter((bom) => bom.bomId !== id);
    const removed = boms.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

