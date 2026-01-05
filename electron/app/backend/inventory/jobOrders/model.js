import { v4 as uuidv4 } from "uuid";
import {
  readInventoryCollection,
  mutateInventoryCollection,
} from "../../storage/inventoryStore.js";

export const findAll = async (companyId) =>
  readInventoryCollection(companyId, "jobOrders");

export const findById = async (companyId, id) => {
  const orders = await findAll(companyId);
  return orders.find((order) => order.orderId === id) || null;
};

export const findByPartyId = async (companyId, partyId) => {
  const orders = await findAll(companyId);
  return orders.filter((order) => order.partyId === partyId);
};

export const findByType = async (companyId, type) => {
  const orders = await findAll(companyId);
  return orders.filter((order) => order.type === type);
};

export const findByStatus = async (companyId, status) => {
  const orders = await findAll(companyId);
  return orders.filter((order) => order.status === status);
};

export const create = async (companyId, payload) =>
  mutateInventoryCollection(companyId, "jobOrders", (orders) => {
    const now = new Date().toISOString();
    const record = {
      orderId: uuidv4(),
      status: "OPEN",
      items: [],
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...orders, record], result: record };
  });

export const updateById = async (companyId, id, updates) =>
  mutateInventoryCollection(companyId, "jobOrders", (orders) => {
    const index = orders.findIndex((order) => order.orderId === id);
    if (index === -1) {
      return { nextData: orders, result: null, skipWrite: true };
    }

    const now = new Date().toISOString();
    const updated = {
      ...orders[index],
      ...updates,
      updatedAt: now,
    };

    const nextData = [...orders];
    nextData[index] = updated;
    return { nextData, result: updated };
  });

export const closeOrder = async (companyId, id) =>
  updateById(companyId, id, { status: "CLOSED" });

export const openOrder = async (companyId, id) =>
  updateById(companyId, id, { status: "OPEN" });

export const deleteById = async (companyId, id) =>
  mutateInventoryCollection(companyId, "jobOrders", (orders) => {
    const nextData = orders.filter((order) => order.orderId !== id);
    const removed = orders.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  });

