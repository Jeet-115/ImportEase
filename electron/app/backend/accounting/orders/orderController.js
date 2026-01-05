import * as orderModel from "./orderModel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[OrderController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const createSalesOrder = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { partyId, date, items, remarks } = req.body;
  const order = await orderModel.create(companyId, "SALES", {
    partyId,
    date,
    items: items.map((it) => ({
      itemId: it.itemId,
      qtyOrdered: it.qty,
      qtyDelivered: 0,
      qtyCancelled: 0,
      rate: it.rate,
    })),
    remarks,
  });
  res.status(201).json(order);
});

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { partyId, date, items, remarks } = req.body;
  const order = await orderModel.create(companyId, "PURCHASE", {
    partyId,
    date,
    items: items.map((it) => ({
      itemId: it.itemId,
      qtyOrdered: it.qty,
      qtyDelivered: 0,
      qtyCancelled: 0,
      rate: it.rate,
    })),
    remarks,
  });
  res.status(201).json(order);
});

export const createJobOrder = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { partyId, date, items, remarks } = req.body;
  const order = await orderModel.create(companyId, "JOB", {
    partyId,
    date,
    items: items.map((it) => ({
      itemId: it.itemId,
      qtyOrdered: it.qty,
      qtyDelivered: 0,
      qtyCancelled: 0,
      rate: it.rate,
    })),
    remarks,
  });
  res.status(201).json(order);
});

export const updateOrder = asyncHandler(async (req, res) => {
  const { companyId, orderType, orderId } = req.params;
  const order = await orderModel.updateById(companyId, orderType.toUpperCase(), orderId, req.body);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json(order);
});

export const precloseOrder = asyncHandler(async (req, res) => {
  const { companyId, orderType, orderId } = req.params;
  const order = await orderModel.updateById(companyId, orderType.toUpperCase(), orderId, {
    status: "CLOSED",
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json(order);
});

export const getPendingOrders = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { orderType } = req.query;
  const orders = await orderModel.findPendingOrders(companyId, orderType?.toUpperCase() || "SALES");
  res.json(orders);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { orderType } = req.query;
  const orders = await orderModel.findAll(companyId, orderType?.toUpperCase() || "SALES");
  res.json(orders);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const { companyId, orderType, orderId } = req.params;
  const order = await orderModel.findById(companyId, orderType.toUpperCase(), orderId);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json(order);
});

