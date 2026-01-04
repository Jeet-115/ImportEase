import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "groups");

export const findById = async (companyId, id) => {
  const groups = await findAll(companyId);
  return groups.find((group) => group.id === id) || null;
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "groups", (groups) => {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...groups, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "groups", (groups) => {
    const index = groups.findIndex((group) => group.id === id);
    if (index === -1) {
      return { nextData: groups, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...groups[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...groups];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "groups", (groups) => {
    const nextData = groups.filter((group) => group.id !== id);
    const removed = groups.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

export const getChildren = async (companyId, parentId) => {
  const groups = await findAll(companyId);
  return groups.filter((group) => group.parentGroupId === parentId);
};

export const hasChildren = async (companyId, groupId) => {
  const children = await getChildren(companyId, groupId);
  return children.length > 0;
};

export const isGroupUsed = async (companyId, groupId) => {
  // Check if group is used in stock items
  const { findAll: findAllStockItems } = await import("../items/model.js");
  const items = await findAllStockItems(companyId);
  return items.some((item) => item.groupId === groupId);
};

