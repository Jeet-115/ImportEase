import { v4 as uuidv4 } from "uuid";
import { saveVoucherWithTransactions, createTransaction } from "../helpers.js";
import { getStockItemById } from "../../../items/model.js";
import { getGodownById } from "../../../godowns/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[PhysicalStockController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const createPhysicalStock = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { voucherNo, date, items, remarks } = req.body;

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

    if (item.qty < 0) {
      return res.status(400).json({ message: "Physical stock qty must be non-negative" });
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

  const voucherId = `PHY-${voucherNo}`;
  const voucher = {
    voucherId,
    voucherNo,
    date,
    items,
    remarks: remarks || null,
    createdAt: new Date().toISOString(),
  };

  // Create transactions (mode = ABSOLUTE, sets stock to counted qty)
  const transactions = items.map((item) =>
    createTransaction(
      companyId,
      {
        voucherType: "PHYSICAL",
        voucherId,
        date,
        trackingNo: null,
      },
      {
        ...item,
        qty: Math.abs(item.qty), // Physical stock is always positive
      }
    )
  );

  await saveVoucherWithTransactions(companyId, "physicalStock", voucher, transactions);

  return res.status(201).json({ voucher, transactions });
});

