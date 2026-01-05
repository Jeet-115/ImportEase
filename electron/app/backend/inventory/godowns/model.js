import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "godowns");

export const findById = async (companyId, id) => {
  const godowns = await findAll(companyId);
  return godowns.find((godown) => godown.id === id) || null;
};

// Alias for consistency
export const getGodownById = findById;

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "godowns", (godowns) => {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...godowns, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "godowns", (godowns) => {
    const index = godowns.findIndex((godown) => godown.id === id);
    if (index === -1) {
      return { nextData: godowns, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...godowns[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...godowns];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "godowns", (godowns) => {
    const nextData = godowns.filter((godown) => godown.id !== id);
    const removed = godowns.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

export const getChildren = async (companyId, parentId) => {
  const godowns = await findAll(companyId);
  return godowns.filter((godown) => godown.parentGodownId === parentId);
};

export const hasChildren = async (companyId, godownId) => {
  const children = await getChildren(companyId, godownId);
  return children.length > 0;
};

export const isGodownUsed = async (companyId, godownId) => {
  // Check if godown has stock allocated
  const { findAll: findAllStockItems } = await import("../items/model.js");
  const items = await findAllStockItems(companyId);
  return items.some(
    (item) =>
      item.openingBalance?.godownAllocations?.some(
        (alloc) => alloc.godownId === godownId
      )
  );
};

