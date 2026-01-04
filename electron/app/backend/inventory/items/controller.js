import {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
} from "./model.js";
import { findById as findCompanyById } from "../../models/companymastermodel.js";
import { findById as findUnitById } from "../units/model.js";
import { findById as findGroupById } from "../groups/model.js";
import { findById as findCategoryById } from "../categories/model.js";
import { findById as findGodownById } from "../godowns/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("StockItemsController Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getItems = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Auto-create file if it doesn't exist - no company validation needed for GET
  const items = await findAll(companyId);
  return res.json(items || []);
});

export const getItemById = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const item = await findById(companyId, id);
  if (!item) {
    return res.status(404).json({ message: "Stock item not found" });
  }
  return res.json(item);
});

export const createItem = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const itemData = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  if (!itemData.name || !itemData.name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  // Validate unit exists
  if (itemData.unitId) {
    const unit = await findUnitById(companyId, itemData.unitId);
    if (!unit) {
      return res.status(400).json({ message: "Unit not found" });
    }
  }

  // Validate group exists
  if (itemData.groupId) {
    const group = await findGroupById(companyId, itemData.groupId);
    if (!group) {
      return res.status(400).json({ message: "Stock group not found" });
    }
  }

  // Validate category exists
  if (itemData.categoryId) {
    const category = await findCategoryById(companyId, itemData.categoryId);
    if (!category) {
      return res.status(400).json({ message: "Stock category not found" });
    }
  }

  // Validate alternate units
  if (itemData.alternateUnits && Array.isArray(itemData.alternateUnits)) {
    for (const altUnit of itemData.alternateUnits) {
      if (altUnit.unitId) {
        const altUnitExists = await findUnitById(companyId, altUnit.unitId);
        if (!altUnitExists) {
          return res.status(400).json({
            message: `Alternate unit ${altUnit.unitId} not found`,
          });
        }
      }
    }
  }

  // Validate godown allocations
  if (
    itemData.openingBalance?.godownAllocations &&
    Array.isArray(itemData.openingBalance.godownAllocations)
  ) {
    for (const alloc of itemData.openingBalance.godownAllocations) {
      if (alloc.godownId) {
        const godown = await findGodownById(companyId, alloc.godownId);
        if (!godown) {
          return res.status(400).json({
            message: `Godown ${alloc.godownId} not found`,
          });
        }
      }
    }
  }

  const item = await create(companyId, itemData);
  return res.status(201).json(item);
});

export const updateItem = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingItem = await findById(companyId, id);
  if (!existingItem) {
    return res.status(404).json({ message: "Stock item not found" });
  }

  // Validate unit exists if provided
  if (updates.unitId) {
    const unit = await findUnitById(companyId, updates.unitId);
    if (!unit) {
      return res.status(400).json({ message: "Unit not found" });
    }
  }

  // Validate group exists if provided
  if (updates.groupId) {
    const group = await findGroupById(companyId, updates.groupId);
    if (!group) {
      return res.status(400).json({ message: "Stock group not found" });
    }
  }

  // Validate category exists if provided
  if (updates.categoryId) {
    const category = await findCategoryById(companyId, updates.categoryId);
    if (!category) {
      return res.status(400).json({ message: "Stock category not found" });
    }
  }

  // Validate alternate units
  if (updates.alternateUnits && Array.isArray(updates.alternateUnits)) {
    for (const altUnit of updates.alternateUnits) {
      if (altUnit.unitId) {
        const altUnitExists = await findUnitById(companyId, altUnit.unitId);
        if (!altUnitExists) {
          return res.status(400).json({
            message: `Alternate unit ${altUnit.unitId} not found`,
          });
        }
      }
    }
  }

  // Validate godown allocations
  if (
    updates.openingBalance?.godownAllocations &&
    Array.isArray(updates.openingBalance.godownAllocations)
  ) {
    for (const alloc of updates.openingBalance.godownAllocations) {
      if (alloc.godownId) {
        const godown = await findGodownById(companyId, alloc.godownId);
        if (!godown) {
          return res.status(400).json({
            message: `Godown ${alloc.godownId} not found`,
          });
        }
      }
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteItem = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const existingItem = await findById(companyId, id);
  if (!existingItem) {
    return res.status(404).json({ message: "Stock item not found" });
  }

  // TODO: In future phases, check if item has transactions
  // For now, allow deletion

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Stock item not found" });
  }

  return res.json({ message: "Stock item deleted successfully" });
});

