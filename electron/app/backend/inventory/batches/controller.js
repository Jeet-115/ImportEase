import {
  findAll,
  findById,
  findByItemId,
  findByBatchNo,
  create,
  updateById,
  deleteById,
} from "./model.js";
import { getStockItemById } from "../items/model.js";
import { getGodownById } from "../godowns/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[BatchesController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllBatches = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (itemId) {
    const batches = await findByItemId(companyId, itemId);
    return res.json(batches);
  }

  const batches = await findAll(companyId);
  return res.json(batches || []);
});

export const getBatch = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const batch = await findById(companyId, id);
  if (!batch) {
    return res.status(404).json({ message: "Batch not found" });
  }
  return res.json(batch);
});

export const createBatch = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, batchNo, mfgDate, expDate, qty, godownId } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!itemId || !batchNo) {
    return res.status(400).json({ message: "itemId and batchNo are required" });
  }

  // Validate item exists
  const item = await getStockItemById(companyId, itemId);
  if (!item) {
    return res.status(400).json({ message: "Stock item not found" });
  }

  // Validate godown exists if provided
  if (godownId) {
    const godown = await getGodownById(companyId, godownId);
    if (!godown) {
      return res.status(400).json({ message: "Godown not found" });
    }
  }

  // Check for duplicate batch number
  const existing = await findByBatchNo(companyId, batchNo);
  if (existing) {
    return res.status(400).json({ message: "Batch number already exists" });
  }

  const batch = await create(companyId, {
    itemId,
    batchNo,
    mfgDate: mfgDate || null,
    expDate: expDate || null,
    qty: qty || 0,
    godownId: godownId || null,
  });

  return res.status(201).json(batch);
});

export const updateBatch = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingBatch = await findById(companyId, id);
  if (!existingBatch) {
    return res.status(404).json({ message: "Batch not found" });
  }

  // Validate godown if provided
  if (updates.godownId) {
    const godown = await getGodownById(companyId, updates.godownId);
    if (!godown) {
      return res.status(400).json({ message: "Godown not found" });
    }
  }

  // Check for duplicate batch number if changing
  if (updates.batchNo && updates.batchNo !== existingBatch.batchNo) {
    const existing = await findByBatchNo(companyId, updates.batchNo);
    if (existing) {
      return res.status(400).json({ message: "Batch number already exists" });
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteBatch = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Batch not found" });
  }

  return res.json({ message: "Batch deleted successfully" });
});

