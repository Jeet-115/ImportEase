import {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
  findSimpleUnits,
  isUnitUsed,
  isUnitUsedInCompound,
} from "./model.js";
import { findById as findCompanyById } from "../../models/companymastermodel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("UnitsController Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getUnits = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Auto-create file if it doesn't exist - no company validation needed for GET
  const units = await findAll(companyId);
  return res.json(units || []);
});

export const getUnitById = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const unit = await findById(companyId, id);
  if (!unit) {
    return res.status(404).json({ message: "Unit not found" });
  }
  return res.json(unit);
});

export const createUnit = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const unitData = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Validate company exists
  const company = await findCompanyById(companyId);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  // Validate required fields
  if (!unitData.type || !["simple", "compound"].includes(unitData.type)) {
    return res.status(400).json({
      message: "type is required and must be 'simple' or 'compound'",
    });
  }

  if (!unitData.symbol || !unitData.symbol.trim()) {
    return res.status(400).json({ message: "symbol is required" });
  }

  // Validate compound unit requirements
  if (unitData.type === "compound") {
    if (
      !unitData.conversion?.firstUnitId ||
      !unitData.conversion?.secondUnitId ||
      !unitData.conversion?.factor
    ) {
      return res.status(400).json({
        message:
          "Compound units require conversion with firstUnitId, secondUnitId, and factor",
      });
    }

    // Validate referenced units exist and are simple
    const firstUnit = await findById(companyId, unitData.conversion.firstUnitId);
    const secondUnit = await findById(
      companyId,
      unitData.conversion.secondUnitId
    );

    if (!firstUnit || firstUnit.type !== "simple") {
      return res.status(400).json({
        message: "firstUnitId must reference an existing simple unit",
      });
    }

    if (!secondUnit || secondUnit.type !== "simple") {
      return res.status(400).json({
        message: "secondUnitId must reference an existing simple unit",
      });
    }
  } else {
    // Simple units cannot have conversion
    delete unitData.conversion;
  }

  const unit = await create(companyId, unitData);
  return res.status(201).json(unit);
});

export const updateUnit = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingUnit = await findById(companyId, id);
  if (!existingUnit) {
    return res.status(404).json({ message: "Unit not found" });
  }

  // Prevent changing type from simple to compound if it's used
  if (updates.type && updates.type !== existingUnit.type) {
    const isUsed = await isUnitUsed(companyId, id);
    if (isUsed) {
      return res.status(400).json({
        message: "Cannot change unit type when unit is in use",
      });
    }
  }

  // Validate compound unit conversion if type is compound
  if (updates.type === "compound" || existingUnit.type === "compound") {
    const conversion = updates.conversion || existingUnit.conversion;
    if (conversion) {
      const firstUnit = await findById(companyId, conversion.firstUnitId);
      const secondUnit = await findById(companyId, conversion.secondUnitId);

      if (!firstUnit || firstUnit.type !== "simple") {
        return res.status(400).json({
          message: "firstUnitId must reference an existing simple unit",
        });
      }

      if (!secondUnit || secondUnit.type !== "simple") {
        return res.status(400).json({
          message: "secondUnitId must reference an existing simple unit",
        });
      }
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const existingUnit = await findById(companyId, id);
  if (!existingUnit) {
    return res.status(404).json({ message: "Unit not found" });
  }

  // Check if unit is used in stock items
  const usedInItems = await isUnitUsed(companyId, id);
  if (usedInItems) {
    return res.status(400).json({
      message: "Cannot delete unit that is used in stock items",
    });
  }

  // Check if unit is used in compound units
  const usedInCompound = await isUnitUsedInCompound(companyId, id);
  if (usedInCompound) {
    return res.status(400).json({
      message: "Cannot delete unit that is used in compound units",
    });
  }

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Unit not found" });
  }

  return res.json({ message: "Unit deleted successfully" });
});

export const getSimpleUnits = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const simpleUnits = await findSimpleUnits(companyId);
  return res.json(simpleUnits);
});

