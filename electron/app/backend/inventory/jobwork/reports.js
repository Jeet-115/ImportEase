import { findAll as findAllJobOrders } from "../jobOrders/model.js";
import { findAll as findAllMaterialMovements } from "../materialMovements/model.js";
import { findAll as findAllItems } from "../items/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[JobWorkReports] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getOrdersSummary = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { type, status } = req.query;

  const orders = await findAllJobOrders(companyId);
  const items = await findAllItems(companyId);

  let filteredOrders = orders;

  if (type) {
    filteredOrders = filteredOrders.filter((o) => o.type === type);
  }

  if (status) {
    filteredOrders = filteredOrders.filter((o) => o.status === status);
  }

  const summary = filteredOrders.map((order) => {
    const orderItems = order.items || [];
    const totalQty = orderItems.reduce((sum, item) => sum + (item.qty || 0), 0);

    return {
      orderId: order.orderId,
      type: order.type,
      partyId: order.partyId,
      processDuration: order.processDuration,
      processNature: order.processNature,
      status: order.status,
      totalItems: orderItems.length,
      totalQty,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });

  return res.json(summary);
});

export const getComponentsOutstanding = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { jobOrderId } = req.query;

  const orders = await findAllJobOrders(companyId);
  const items = await findAllItems(companyId);

  let filteredOrders = orders;
  if (jobOrderId) {
    filteredOrders = filteredOrders.filter((o) => o.orderId === jobOrderId);
  }

  const outstanding = [];

  for (const order of filteredOrders) {
    if (order.status !== "OPEN") continue;

    for (const orderItem of order.items || []) {
      for (const component of orderItem.components || []) {
        if (component.track === "PENDING_ISSUE" || component.track === "PENDING_RECEIVE") {
          const item = items.find((i) => i.id === component.itemId);
          outstanding.push({
            orderId: order.orderId,
            orderType: order.type,
            finishedItemId: orderItem.finishedItemId,
            finishedItemName: items.find((i) => i.id === orderItem.finishedItemId)?.name || "Unknown",
            componentItemId: component.itemId,
            componentItemName: item?.name || "Unknown",
            track: component.track,
            qty: component.qty || 0,
            godownId: component.godownId,
          });
        }
      }
    }
  }

  return res.json(outstanding);
});

export const getMaterialInRegister = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { jobOrderId, fromDate, toDate } = req.query;

  const movements = await findAllMaterialMovements(companyId);
  const items = await findAllItems(companyId);

  let filteredMovements = movements.filter(
    (m) => m.type === "MATERIAL_IN_RM" || m.type === "MATERIAL_IN_FG"
  );

  if (jobOrderId) {
    filteredMovements = filteredMovements.filter((m) => m.jobOrderId === jobOrderId);
  }

  if (fromDate) {
    filteredMovements = filteredMovements.filter((m) => m.date >= fromDate);
  }

  if (toDate) {
    filteredMovements = filteredMovements.filter((m) => m.date <= toDate);
  }

  const register = filteredMovements.map((movement) => {
    const item = items.find((i) => i.id === movement.itemId);
    return {
      movementId: movement.movementId,
      date: movement.date,
      type: movement.type,
      jobOrderId: movement.jobOrderId,
      itemId: movement.itemId,
      itemName: item?.name || "Unknown",
      qty: movement.qty,
      godownId: movement.godownId,
      partyId: movement.partyId,
      costTrackId: movement.costTrackId,
    };
  });

  return res.json(register);
});

export const getMaterialOutRegister = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { jobOrderId, fromDate, toDate } = req.query;

  const movements = await findAllMaterialMovements(companyId);
  const items = await findAllItems(companyId);

  let filteredMovements = movements.filter(
    (m) => m.type === "MATERIAL_OUT_RM" || m.type === "MATERIAL_OUT_FG"
  );

  if (jobOrderId) {
    filteredMovements = filteredMovements.filter((m) => m.jobOrderId === jobOrderId);
  }

  if (fromDate) {
    filteredMovements = filteredMovements.filter((m) => m.date >= fromDate);
  }

  if (toDate) {
    filteredMovements = filteredMovements.filter((m) => m.date <= toDate);
  }

  const register = filteredMovements.map((movement) => {
    const item = items.find((i) => i.id === movement.itemId);
    return {
      movementId: movement.movementId,
      date: movement.date,
      type: movement.type,
      jobOrderId: movement.jobOrderId,
      itemId: movement.itemId,
      itemName: item?.name || "Unknown",
      qty: movement.qty,
      godownId: movement.godownId,
      partyId: movement.partyId,
      costTrackId: movement.costTrackId,
    };
  });

  return res.json(register);
});

export const getMaterialMovementRegister = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { jobOrderId, fromDate, toDate } = req.query;

  const movements = await findAllMaterialMovements(companyId);
  const items = await findAllItems(companyId);

  let filteredMovements = movements;

  if (jobOrderId) {
    filteredMovements = filteredMovements.filter((m) => m.jobOrderId === jobOrderId);
  }

  if (fromDate) {
    filteredMovements = filteredMovements.filter((m) => m.date >= fromDate);
  }

  if (toDate) {
    filteredMovements = filteredMovements.filter((m) => m.date <= toDate);
  }

  const register = filteredMovements.map((movement) => {
    const item = items.find((i) => i.id === movement.itemId);
    return {
      movementId: movement.movementId,
      date: movement.date,
      type: movement.type,
      direction: movement.direction,
      jobOrderId: movement.jobOrderId,
      itemId: movement.itemId,
      itemName: item?.name || "Unknown",
      qty: movement.qty,
      godownId: movement.godownId,
      partyId: movement.partyId,
      costTrackId: movement.costTrackId,
    };
  });

  return res.json(register);
});

export const getIssueVariance = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { jobOrderId } = req.query;

  const orders = await findAllJobOrders(companyId);
  const movements = await findAllMaterialMovements(companyId);
  const items = await findAllItems(companyId);

  let filteredOrders = orders;
  if (jobOrderId) {
    filteredOrders = filteredOrders.filter((o) => o.orderId === jobOrderId);
  }

  const variances = [];

  for (const order of filteredOrders) {
    for (const orderItem of order.items || []) {
      for (const component of orderItem.components || []) {
        if (component.track === "PENDING_ISSUE") {
          const issuedMovements = movements.filter(
            (m) =>
              m.jobOrderId === order.orderId &&
              m.itemId === component.itemId &&
              m.type === "MATERIAL_OUT_RM" &&
              m.direction === "OUT"
          );

          const issuedQty = issuedMovements.reduce((sum, m) => sum + (m.qty || 0), 0);
          const orderedQty = component.qty || 0;
          const variance = orderedQty - issuedQty;

          if (variance !== 0) {
            const item = items.find((i) => i.id === component.itemId);
            variances.push({
              orderId: order.orderId,
              orderType: order.type,
              componentItemId: component.itemId,
              componentItemName: item?.name || "Unknown",
              orderedQty,
              issuedQty,
              variance,
            });
          }
        }
      }
    }
  }

  return res.json(variances);
});

export const getReceiptVariance = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { jobOrderId } = req.query;

  const orders = await findAllJobOrders(companyId);
  const movements = await findAllMaterialMovements(companyId);
  const items = await findAllItems(companyId);

  let filteredOrders = orders;
  if (jobOrderId) {
    filteredOrders = filteredOrders.filter((o) => o.orderId === jobOrderId);
  }

  const variances = [];

  for (const order of filteredOrders) {
    for (const orderItem of order.items || []) {
      for (const component of orderItem.components || []) {
        if (component.track === "PENDING_RECEIVE") {
          const receivedMovements = movements.filter(
            (m) =>
              m.jobOrderId === order.orderId &&
              m.itemId === component.itemId &&
              (m.type === "MATERIAL_IN_RM" || m.type === "MATERIAL_IN_FG") &&
              m.direction === "IN"
          );

          const receivedQty = receivedMovements.reduce((sum, m) => sum + (m.qty || 0), 0);
          const orderedQty = component.qty || 0;
          const variance = orderedQty - receivedQty;

          if (variance !== 0) {
            const item = items.find((i) => i.id === component.itemId);
            variances.push({
              orderId: order.orderId,
              orderType: order.type,
              componentItemId: component.itemId,
              componentItemName: item?.name || "Unknown",
              orderedQty,
              receivedQty,
              variance,
            });
          }
        }
      }
    }
  }

  return res.json(variances);
});

