import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "categories");

export const findById = async (companyId, id) => {
  const categories = await findAll(companyId);
  return categories.find((category) => category.id === id) || null;
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "categories", (categories) => {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...categories, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "categories", (categories) => {
    const index = categories.findIndex((category) => category.id === id);
    if (index === -1) {
      return { nextData: categories, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...categories[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...categories];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "categories", (categories) => {
    const nextData = categories.filter((category) => category.id !== id);
    const removed = categories.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

export const getChildren = async (companyId, parentId) => {
  const categories = await findAll(companyId);
  return categories.filter((category) => category.parentCategoryId === parentId);
};

export const hasChildren = async (companyId, categoryId) => {
  const children = await getChildren(companyId, categoryId);
  return children.length > 0;
};

export const isCategoryUsed = async (companyId, categoryId) => {
  // Check if category is used in stock items
  const { findAll: findAllStockItems } = await import("../items/model.js");
  const items = await findAllStockItems(companyId);
  return items.some((item) => item.categoryId === categoryId);
};

