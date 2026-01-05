import {
  findAllTransactions,
  findTransactionsByFilter,
  computeStock,
  computeStockForAllItems,
} from "./model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[TransactionsController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllTransactions = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, godownId, batchId, voucherType, voucherId, fromDate, toDate } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const filter = {};
  if (itemId) filter.itemId = itemId;
  if (godownId) filter.godownId = godownId;
  if (batchId !== undefined) filter.batchId = batchId === "null" ? null : batchId;
  if (voucherType) filter.voucherType = voucherType;
  if (voucherId) filter.voucherId = voucherId;
  if (fromDate) filter.fromDate = fromDate;
  if (toDate) filter.toDate = toDate;

  const transactions = Object.keys(filter).length > 0
    ? await findTransactionsByFilter(companyId, filter)
    : await findAllTransactions(companyId);

  return res.json(transactions || []);
});

export const getStock = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, godownId, batchId } = req.query;

  if (!companyId || !itemId || !godownId) {
    return res.status(400).json({ message: "companyId, itemId, and godownId are required" });
  }

  const stock = await computeStock(
    companyId,
    itemId,
    godownId,
    batchId === "null" ? null : batchId || null
  );

  return res.json({ itemId, godownId, batchId: batchId || null, stock });
});

export const getAllStock = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const stock = await computeStockForAllItems(companyId);
  return res.json(stock);
});

