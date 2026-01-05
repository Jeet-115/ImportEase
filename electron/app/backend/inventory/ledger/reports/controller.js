import { findAllTransactions, computeStockForAllItems, computeStock } from "../transactions/model.js";
import { findAll as findAllTrackingNumbers } from "../tracking/model.js";
import { findAll as findAllItems } from "../../items/model.js";
import { findAll as findAllGodowns } from "../../godowns/model.js";
import { findAll as findAllBatches } from "../../batches/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[ReportsController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getStockSummary = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, godownId } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const items = await findAllItems(companyId);
  const godowns = await findAllGodowns(companyId);
  const stockData = await computeStockForAllItems(companyId);

  // Build summary
  const summary = [];

  for (const stock of stockData) {
    // Apply filters
    if (itemId && stock.itemId !== itemId) continue;
    if (godownId && stock.godownId !== godownId) continue;

    const item = items.find((i) => i.id === stock.itemId);
    const godown = godowns.find((g) => g.id === stock.godownId);

    if (!item || !godown) continue;

    summary.push({
      itemId: stock.itemId,
      itemName: item.name,
      itemAlias: item.alias || "",
      godownId: stock.godownId,
      godownName: godown.name,
      batchId: stock.batchId,
      stock: stock.stock,
    });
  }

  return res.json(summary);
});

export const getBatchSummary = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const items = await findAllItems(companyId);
  const batches = await findAllBatches(companyId);
  const stockData = await computeStockForAllItems(companyId);

  // Filter by batches only
  const batchStock = stockData.filter((s) => s.batchId !== null);

  // Apply item filter
  const filtered = itemId
    ? batchStock.filter((s) => s.itemId === itemId)
    : batchStock;

  const summary = filtered.map((stock) => {
    const item = items.find((i) => i.id === stock.itemId);
    const batch = batches.find((b) => b.batchId === stock.batchId);

    return {
      itemId: stock.itemId,
      itemName: item?.name || "Unknown",
      batchId: stock.batchId,
      batchNo: batch?.batchNo || "Unknown",
      mfgDate: batch?.mfgDate || null,
      expDate: batch?.expDate || null,
      godownId: stock.godownId,
      stock: stock.stock,
    };
  });

  return res.json(summary);
});

export const getGodownSummary = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { godownId } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const items = await findAllItems(companyId);
  const godowns = await findAllGodowns(companyId);
  const stockData = await computeStockForAllItems(companyId);

  // Filter by godown
  const filtered = godownId
    ? stockData.filter((s) => s.godownId === godownId)
    : stockData;

  // Group by godown
  const godownMap = new Map();

  for (const stock of filtered) {
    if (!godownMap.has(stock.godownId)) {
      const godown = godowns.find((g) => g.id === stock.godownId);
      godownMap.set(stock.godownId, {
        godownId: stock.godownId,
        godownName: godown?.name || "Unknown",
        items: [],
        totalItems: 0,
        totalValue: 0,
      });
    }

    const item = items.find((i) => i.id === stock.itemId);
    const entry = godownMap.get(stock.godownId);
    entry.items.push({
      itemId: stock.itemId,
      itemName: item?.name || "Unknown",
      batchId: stock.batchId,
      stock: stock.stock,
    });
    entry.totalItems += 1;
    // Note: Value calculation would require rate from transactions, simplified here
  }

  return res.json(Array.from(godownMap.values()));
});

export const getNegativeStock = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const items = await findAllItems(companyId);
  const godowns = await findAllGodowns(companyId);
  const stockData = await computeStockForAllItems(companyId);

  // Find negative stock
  const negative = stockData
    .filter((s) => s.stock < 0)
    .map((stock) => {
      const item = items.find((i) => i.id === stock.itemId);
      const godown = godowns.find((g) => g.id === stock.godownId);

      return {
        itemId: stock.itemId,
        itemName: item?.name || "Unknown",
        godownId: stock.godownId,
        godownName: godown?.name || "Unknown",
        batchId: stock.batchId,
        stock: stock.stock,
      };
    });

  return res.json(negative);
});

export const getSalesBillsPending = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const transactions = await findAllTransactions(companyId);
  const trackings = await findAllTrackingNumbers(companyId);

  // Find open tracking numbers where source is DELIVERY_NOTE and target is SALES
  const openDeliveries = trackings.filter(
    (t) =>
      t.status === "OPEN" &&
      t.sourceVoucher === "DELIVERY_NOTE" &&
      t.targetVoucher === "SALES"
  );

  // Get delivery note transactions for these tracking numbers
  const pending = [];

  for (const tracking of openDeliveries) {
    const deliveryTxs = transactions.filter(
      (tx) =>
        tx.trackingNo === tracking.trackingNo &&
        tx.voucherType === "DELIVERY_NOTE"
    );

    for (const tx of deliveryTxs) {
      pending.push({
        trackingNo: tracking.trackingNo,
        voucherId: tx.voucherId,
        itemId: tx.itemId,
        godownId: tx.godownId,
        batchId: tx.batchId,
        qty: Math.abs(tx.qty), // Delivery notes have negative qty
        date: tx.date,
      });
    }
  }

  return res.json(pending);
});

export const getPurchaseBillsPending = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const transactions = await findAllTransactions(companyId);
  const trackings = await findAllTrackingNumbers(companyId);

  // Find open tracking numbers where source is RECEIPT_NOTE and target is PURCHASE
  const openReceipts = trackings.filter(
    (t) =>
      t.status === "OPEN" &&
      t.sourceVoucher === "RECEIPT_NOTE" &&
      t.targetVoucher === "PURCHASE"
  );

  // Get receipt note transactions for these tracking numbers
  const pending = [];

  for (const tracking of openReceipts) {
    const receiptTxs = transactions.filter(
      (tx) =>
        tx.trackingNo === tracking.trackingNo &&
        tx.voucherType === "RECEIPT_NOTE"
    );

    for (const tx of receiptTxs) {
      pending.push({
        trackingNo: tracking.trackingNo,
        voucherId: tx.voucherId,
        itemId: tx.itemId,
        godownId: tx.godownId,
        batchId: tx.batchId,
        qty: tx.qty, // Receipt notes have positive qty
        date: tx.date,
      });
    }
  }

  return res.json(pending);
});

export const getJobworkOutstanding = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const transactions = await findAllTransactions(companyId);
  const items = await findAllItems(companyId);

  // Find MATERIAL_OUT transactions (job work material issued)
  const materialOutTxs = transactions.filter(
    (tx) => tx.voucherType === "MATERIAL_OUT"
  );

  // Find MATERIAL_IN transactions (job work material received)
  const materialInTxs = transactions.filter(
    (tx) => tx.voucherType === "MATERIAL_IN"
  );

  // Group by voucherId (job order) and item
  const outstanding = new Map();

  for (const outTx of materialOutTxs) {
    const key = `${outTx.voucherId}|${outTx.itemId}|${outTx.godownId}|${outTx.batchId || "null"}`;
    if (!outstanding.has(key)) {
      outstanding.set(key, {
        voucherId: outTx.voucherId,
        itemId: outTx.itemId,
        itemName: items.find((i) => i.id === outTx.itemId)?.name || "Unknown",
        godownId: outTx.godownId,
        batchId: outTx.batchId,
        issuedQty: 0,
        receivedQty: 0,
      });
    }
    const entry = outstanding.get(key);
    entry.issuedQty += Math.abs(outTx.qty); // Material out is negative
  }

  for (const inTx of materialInTxs) {
    const key = `${inTx.voucherId}|${inTx.itemId}|${inTx.godownId}|${inTx.batchId || "null"}`;
    if (outstanding.has(key)) {
      const entry = outstanding.get(key);
      entry.receivedQty += inTx.qty; // Material in is positive
    }
  }

  // Calculate outstanding (issued - received)
  const result = Array.from(outstanding.values())
    .map((entry) => ({
      ...entry,
      outstandingQty: entry.issuedQty - entry.receivedQty,
    }))
    .filter((entry) => entry.outstandingQty > 0); // Only show outstanding

  return res.json(result);
});

