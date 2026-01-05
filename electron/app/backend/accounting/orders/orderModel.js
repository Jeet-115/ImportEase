import { v4 as uuidv4 } from "uuid";
import {
  mutateAccountingCollection,
  readAccountingCollection,
} from "../../storage/accountingStore.js";

const ORDER_TYPES = {
  SALES: "salesOrders",
  PURCHASE: "purchaseOrders",
  JOB: "jobOrders",
};

const getOrderCollection = (orderType) => {
  if (!ORDER_TYPES[orderType]) {
    throw new Error(`Invalid order type: ${orderType}`);
  }
  return ORDER_TYPES[orderType];
};

export const findAll = async (companyId, orderType) => {
  const collection = getOrderCollection(orderType);
  return readAccountingCollection(companyId, collection, "orders");
};

export const findById = async (companyId, orderType, orderId) => {
  const orders = await findAll(companyId, orderType);
  return orders.find((order) => order.orderId === orderId) || null;
};

export const create = async (companyId, orderType, payload) => {
  const collection = getOrderCollection(orderType);
  return mutateAccountingCollection(companyId, collection, (orders) => {
    const now = new Date().toISOString();
    const order = {
      orderId: payload.orderId || uuidv4(),
      partyId: payload.partyId,
      date: payload.date,
      items: payload.items || [],
      status: payload.status || "OPEN",
      remarks: payload.remarks || "",
      createdAt: now,
      updatedAt: now,
    };
    return { nextData: [...orders, order], result: order };
  }, "orders");
};

export const updateById = async (companyId, orderType, orderId, updates) => {
  const collection = getOrderCollection(orderType);
  return mutateAccountingCollection(companyId, collection, (orders) => {
    const index = orders.findIndex((order) => order.orderId === orderId);
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
  }, "orders");
};

export const deleteById = async (companyId, orderType, orderId) => {
  const collection = getOrderCollection(orderType);
  return mutateAccountingCollection(companyId, collection, (orders) => {
    const nextData = orders.filter((order) => order.orderId !== orderId);
    const removed = orders.length !== nextData.length;

    return {
      nextData,
      result: removed ? true : null,
      skipWrite: !removed,
    };
  }, "orders");
};

export const findPendingOrders = async (companyId, orderType) => {
  const orders = await findAll(companyId, orderType);
  return orders.filter((order) => {
    if (order.status !== "OPEN") return false;
    // Check if any item has pending quantity
    return order.items.some(
      (item) =>
        (item.qtyOrdered || 0) >
        (item.qtyDelivered || 0) + (item.qtyCancelled || 0)
    );
  });
};

export const updateOrderLineDelivery = async (
  companyId,
  orderType,
  orderId,
  itemId,
  qtyDelivered
) => {
  const collection = getOrderCollection(orderType);
  return mutateAccountingCollection(companyId, collection, (orders) => {
    const orderIndex = orders.findIndex((order) => order.orderId === orderId);
    if (orderIndex === -1) {
      return { nextData: orders, result: null, skipWrite: true };
    }

    const order = orders[orderIndex];
    const itemIndex = order.items.findIndex((item) => item.itemId === itemId);
    if (itemIndex === -1) {
      return { nextData: orders, result: null, skipWrite: true };
    }

    const item = order.items[itemIndex];
    const newDelivered = (item.qtyDelivered || 0) + qtyDelivered;
    const totalDelivered = newDelivered + (item.qtyCancelled || 0);

    if (totalDelivered > (item.qtyOrdered || 0)) {
      throw new Error("Cannot deliver more than ordered quantity");
    }

    const updatedItems = [...order.items];
    updatedItems[itemIndex] = {
      ...item,
      qtyDelivered: newDelivered,
    };

    // Check if all items are fully delivered
    const allDelivered = updatedItems.every(
      (it) =>
        (it.qtyDelivered || 0) + (it.qtyCancelled || 0) >= (it.qtyOrdered || 0)
    );

    const updated = {
      ...order,
      items: updatedItems,
      status: allDelivered ? "CLOSED" : order.status,
      updatedAt: new Date().toISOString(),
    };

    const nextData = [...orders];
    nextData[orderIndex] = updated;
    return { nextData, result: updated };
  }, "orders");
};

