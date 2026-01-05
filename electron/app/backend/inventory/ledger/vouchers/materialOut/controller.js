import { v4 as uuidv4 } from "uuid";
import { saveVoucherWithTransactions, createTransaction } from "../helpers.js";
import { getStockItemById } from "../../../items/model.js";
import { getGodownById } from "../../../godowns/model.js";
import { findById as findJobOrderById } from "../../../jobOrders/model.js";
import { computeStock } from "../../transactions/model.js";
import { getFeatures } from "../../../features/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[MaterialOutController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const createMaterialOut = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { voucherNo, date, jobOrderId, items, partyId, costTrackId, remarks } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Check if material in/out is enabled
  const features = await getFeatures(companyId);
  if (!features.enableMaterialInOut) {
    return res.status(403).json({ message: "Material In/Out feature is not enabled for this company" });
  }

  if (!voucherNo || !date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "voucherNo, date, and items array are required" });
  }

  // Validate job order if provided
  if (jobOrderId) {
    const jobOrder = await findJobOrderById(companyId, jobOrderId);
    if (!jobOrder) {
      return res.status(400).json({ message: `Job order ${jobOrderId} not found` });
    }
  }

  // Validate items and check stock availability
  for (const item of items) {
    if (!item.itemId || !item.godownId || item.qty === undefined) {
      return res.status(400).json({ message: "Each item must have itemId, godownId, and qty" });
    }

    const stockItem = await getStockItemById(companyId, item.itemId);
    if (!stockItem) {
      return res.status(400).json({ message: `Stock item ${item.itemId} not found` });
    }

    const godown = await getGodownById(companyId, item.godownId);
    if (!godown) {
      return res.status(400).json({ message: `Godown ${item.godownId} not found` });
    }

    // Validate godown is third-party stock
    if (!godown.isThirdPartyStock) {
      return res.status(400).json({ message: `Godown ${item.godownId} must be marked as third-party stock for material out` });
    }

    // Check stock availability
    const availableStock = await computeStock(
      companyId,
      item.itemId,
      item.godownId,
      item.batchId || null
    );

    if (availableStock < Math.abs(item.qty)) {
      return res.status(400).json({
        message: `Insufficient stock for item ${item.itemId} in godown ${item.godownId}. Available: ${availableStock}, Required: ${Math.abs(item.qty)}`,
      });
    }
  }

  const voucherId = `MAT-OUT-${voucherNo}`;
  const voucher = {
    voucherId,
    voucherNo,
    date,
    jobOrderId: jobOrderId || null,
    items,
    partyId: partyId || null,
    costTrackId: costTrackId || null,
    remarks: remarks || null,
    createdAt: new Date().toISOString(),
  };

  // Create transactions (stock goes out - negative qty)
  const transactions = items.map((item) =>
    createTransaction(
      companyId,
      {
        voucherType: "MATERIAL_OUT",
        voucherId,
        date,
        trackingNo: null,
      },
      {
        ...item,
        qty: -Math.abs(item.qty), // Always negative for material out
      }
    )
  );

  await saveVoucherWithTransactions(companyId, "materialOut", voucher, transactions);

  return res.status(201).json({ voucher, transactions });
});

