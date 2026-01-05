import { v4 as uuidv4 } from "uuid";
import { saveVoucherWithTransactions, createTransaction } from "../helpers.js";
import { getStockItemById } from "../../../items/model.js";
import { getGodownById } from "../../../godowns/model.js";
import { findByTrackingNo, closeTracking } from "../../tracking/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[PurchasesController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const createPurchase = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { voucherNo, date, partyId, items, trackingNo, remarks } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!voucherNo || !date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "voucherNo, date, and items array are required" });
  }

  // Validate items
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
  }

  const voucherId = `PUR-${voucherNo}`;
  const voucher = {
    voucherId,
    voucherNo,
    date,
    partyId: partyId || null,
    items,
    trackingNo: trackingNo || null,
    remarks: remarks || null,
    createdAt: new Date().toISOString(),
  };

  // If trackingNo is provided, close the tracking (Receipt Note → Purchase)
  if (trackingNo) {
    const tracking = await findByTrackingNo(companyId, trackingNo);
    if (tracking && tracking.status === "OPEN") {
      await closeTracking(companyId, trackingNo);
    }
    // Stock already moved by Receipt Note, so no transaction
  } else {
    // Tracking = "Not Applicable" → stock comes in now
    const transactions = items.map((item) =>
      createTransaction(
        companyId,
        {
          voucherType: "PURCHASE",
          voucherId,
          date,
          trackingNo: null,
        },
        item
      )
    );
    await saveVoucherWithTransactions(companyId, "purchaseVouchers", voucher, transactions);
    return res.status(201).json({ voucher, transactions });
  }

  // Save voucher only (no stock movement)
  const { appendVoucher } = await import("../../../../storage/inventoryLedgerStore.js");
  await appendVoucher(companyId, "purchaseVouchers", voucher);

  return res.status(201).json({ voucher, transactions: [] });
});

