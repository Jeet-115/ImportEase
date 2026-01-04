import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "units");

export const findById = async (companyId, id) => {
  const units = await findAll(companyId);
  return units.find((unit) => unit.id === id) || null;
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "units", (units) => {
    const now = new Date().toISOString();
    const record = {
      id: uuidv4(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...units, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "units", (units) => {
    const index = units.findIndex((unit) => unit.id === id);
    if (index === -1) {
      return { nextData: units, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...units[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...units];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "units", (units) => {
    const nextData = units.filter((unit) => unit.id !== id);
    const removed = units.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

export const findSimpleUnits = async (companyId) => {
  const units = await findAll(companyId);
  return units.filter((unit) => unit.type === "simple");
};

export const isUnitUsed = async (companyId, unitId) => {
  // Check if unit is used in stock items
  const { findAll: findAllStockItems } = await import("../items/model.js");
  const items = await findAllStockItems(companyId);
  return items.some(
    (item) =>
      item.unitId === unitId ||
      (item.alternateUnits || []).some((alt) => alt.unitId === unitId)
  );
};

export const isUnitUsedInCompound = async (companyId, unitId) => {
  const units = await findAll(companyId);
  return units.some(
    (unit) =>
      unit.type === "compound" &&
      (unit.conversion?.firstUnitId === unitId ||
        unit.conversion?.secondUnitId === unitId)
  );
};

