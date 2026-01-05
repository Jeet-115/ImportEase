import {
  findAll,
  findById,
  findByJobOrderId,
  findByType,
  findByDirection,
  create,
  updateById,
  deleteById,
} from "./model.js";
import { getFeatures } from "../features/model.js";
import { getStockItemById } from "../items/model.js";
import { getGodownById } from "../godowns/model.js";
import { findById as findJobOrderById } from "../jobOrders/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[MaterialMovementsController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

const VALID_TYPES = [
  "MATERIAL_OUT_RM",
  "MATERIAL_OUT_FG",
  "MATERIAL_IN_RM",
  "MATERIAL_IN_FG",
];

export const getAllMaterialMovements = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { jobOrderId, type, direction } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Check if material in/out is enabled
  const features = await getFeatures(companyId);
  if (!features.enableMaterialInOut) {
    return res.status(403).json({ message: "Material In/Out feature is not enabled for this company" });
  }

  let movements = await findAll(companyId);

  if (jobOrderId) {
    movements = await findByJobOrderId(companyId, jobOrderId);
  } else if (type) {
    movements = await findByType(companyId, type);
  } else if (direction) {
    movements = await findByDirection(companyId, direction);
  }

  return res.json(movements || []);
});

export const getMaterialMovement = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const features = await getFeatures(companyId);
  if (!features.enableMaterialInOut) {
    return res.status(403).json({ message: "Material In/Out feature is not enabled for this company" });
  }

  const movement = await findById(companyId, id);
  if (!movement) {
    return res.status(404).json({ message: "Material movement not found" });
  }
  return res.json(movement);
});

export const createMaterialMovement = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { type, jobOrderId, itemId, qty, godownId, partyId, direction, costTrackId } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Check if material in/out is enabled
  const features = await getFeatures(companyId);
  if (!features.enableMaterialInOut) {
    return res.status(403).json({ message: "Material In/Out feature is not enabled for this company" });
  }

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` });
  }

  if (!itemId || !qty || !godownId) {
    return res.status(400).json({ message: "itemId, qty, and godownId are required" });
  }

  if (!direction || !["OUT", "IN"].includes(direction)) {
    return res.status(400).json({ message: "direction must be OUT or IN" });
  }

  // Validate item exists
  const item = await getStockItemById(companyId, itemId);
  if (!item) {
    return res.status(400).json({ message: "Stock item not found" });
  }

  // Validate godown exists and has appropriate flags
  const godown = await getGodownById(companyId, godownId);
  if (!godown) {
    return res.status(400).json({ message: "Godown not found" });
  }

  // Validate godown is third-party if required
  if (direction === "OUT" && !godown.isThirdPartyStock) {
    return res.status(400).json({ message: "Godown must be marked as third-party stock for material out" });
  }

  if (direction === "IN" && !godown.isThirdPartyStockWithUs) {
    return res.status(400).json({ message: "Godown must be marked as third-party stock with us for material in" });
  }

  // Validate job order if provided
  if (jobOrderId) {
    const jobOrder = await findJobOrderById(companyId, jobOrderId);
    if (!jobOrder) {
      return res.status(400).json({ message: "Job order not found" });
    }
  }

  const movement = await create(companyId, {
    type,
    jobOrderId: jobOrderId || null,
    itemId,
    qty: Number(qty),
    godownId,
    partyId: partyId || null,
    direction,
    costTrackId: costTrackId || null,
  });

  return res.status(201).json(movement);
});

export const updateMaterialMovement = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const features = await getFeatures(companyId);
  if (!features.enableMaterialInOut) {
    return res.status(403).json({ message: "Material In/Out feature is not enabled for this company" });
  }

  const existingMovement = await findById(companyId, id);
  if (!existingMovement) {
    return res.status(404).json({ message: "Material movement not found" });
  }

  // Validate type if changing
  if (updates.type && !VALID_TYPES.includes(updates.type)) {
    return res.status(400).json({ message: `type must be one of: ${VALID_TYPES.join(", ")}` });
  }

  // Validate godown if changing
  if (updates.godownId) {
    const godown = await getGodownById(companyId, updates.godownId);
    if (!godown) {
      return res.status(400).json({ message: "Godown not found" });
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteMaterialMovement = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const features = await getFeatures(companyId);
  if (!features.enableMaterialInOut) {
    return res.status(403).json({ message: "Material In/Out feature is not enabled for this company" });
  }

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Material movement not found" });
  }

  return res.json({ message: "Material movement deleted successfully" });
});

