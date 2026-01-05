import { v4 as uuidv4 } from "uuid";
import { saveVoucherWithTransactions, createTransaction } from "../helpers.js";
import { getStockItemById } from "../../../items/model.js";
import { getGodownById } from "../../../godowns/model.js";
import { computeStock } from "../../transactions/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[StockJournalController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const createStockJournal = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { voucherNo, date, entries, remarks } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!voucherNo || !date || !entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ message: "voucherNo, date, and entries array are required" });
  }

  // Validate entries
  for (const entry of entries) {
    if (!entry.itemId || !entry.godownId || entry.qty === undefined) {
      return res.status(400).json({ message: "Each entry must have itemId, godownId, and qty" });
    }

    if (!entry.type || !["SOURCE", "DESTINATION", "WASTAGE"].includes(entry.type)) {
      return res.status(400).json({ message: "Each entry must have type: SOURCE, DESTINATION, or WASTAGE" });
    }

    const stockItem = await getStockItemById(companyId, entry.itemId);
    if (!stockItem) {
      return res.status(400).json({ message: `Stock item ${entry.itemId} not found` });
    }

    const godown = await getGodownById(companyId, entry.godownId);
    if (!godown) {
      return res.status(400).json({ message: `Godown ${entry.godownId} not found` });
    }

    // Check stock availability for SOURCE entries
    if (entry.type === "SOURCE") {
      const availableStock = await computeStock(
        companyId,
        entry.itemId,
        entry.godownId,
        entry.batchId || null
      );

      if (availableStock < Math.abs(entry.qty)) {
        return res.status(400).json({
          message: `Insufficient stock for item ${entry.itemId} in godown ${entry.godownId}. Available: ${availableStock}, Required: ${Math.abs(entry.qty)}`,
        });
      }
    }
  }

  const voucherId = `SJ-${voucherNo}`;
  const voucher = {
    voucherId,
    voucherNo,
    date,
    entries,
    remarks: remarks || null,
    createdAt: new Date().toISOString(),
  };

  // Create transactions
  // SOURCE: negative qty (stock goes out)
  // DESTINATION: positive qty (stock comes in)
  // WASTAGE: negative qty (stock goes out)
  const transactions = entries.map((entry) =>
    createTransaction(
      companyId,
      {
        voucherType: "STOCK_JOURNAL",
        voucherId,
        date,
        trackingNo: null,
      },
      {
        ...entry,
        qty: entry.type === "SOURCE" || entry.type === "WASTAGE"
          ? -Math.abs(entry.qty)
          : Math.abs(entry.qty),
      }
    )
  );

  await saveVoucherWithTransactions(companyId, "stockJournal", voucher, transactions);

  return res.status(201).json({ voucher, transactions });
});

