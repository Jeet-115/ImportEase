import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "materialMovements");

export const findById = async (companyId, id) => {
  const movements = await findAll(companyId);
  return movements.find((movement) => movement.movementId === id) || null;
};

export const findByJobOrderId = async (companyId, jobOrderId) => {
  const movements = await findAll(companyId);
  return movements.filter((movement) => movement.jobOrderId === jobOrderId);
};

export const findByType = async (companyId, type) => {
  const movements = await findAll(companyId);
  return movements.filter((movement) => movement.type === type);
};

export const findByDirection = async (companyId, direction) => {
  const movements = await findAll(companyId);
  return movements.filter((movement) => movement.direction === direction);
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "materialMovements", (movements) => {
    const now = new Date().toISOString();
    const record = {
      movementId: uuidv4(),
      date: now,
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...movements, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "materialMovements", (movements) => {
    const index = movements.findIndex((movement) => movement.movementId === id);
    if (index === -1) {
      return { nextData: movements, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...movements[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...movements];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "materialMovements", (movements) => {
    const nextData = movements.filter((movement) => movement.movementId !== id);
    const removed = movements.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

