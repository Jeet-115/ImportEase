import {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
  hasChildren,
  isGodownUsed,
} from "./model.js";
import { findById as findCompanyById } from "../../models/companymastermodel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("GodownsController Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getGodowns = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Auto-create file if it doesn't exist - no company validation needed for GET
  const godowns = await findAll(companyId);
  return res.json(godowns || []);
});

export const getGodownById = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const godown = await findById(companyId, id);
  if (!godown) {
    return res.status(404).json({ message: "Godown not found" });
  }
  return res.json(godown);
});

export const createGodown = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const godownData = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  if (!godownData.name || !godownData.name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  // Validate parent exists if provided
  if (godownData.parentGodownId) {
    const parent = await findById(companyId, godownData.parentGodownId);
    if (!parent) {
      return res.status(400).json({ message: "Parent godown not found" });
    }
  }

  const godown = await create(companyId, godownData);
  return res.status(201).json(godown);
});

export const updateGodown = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingGodown = await findById(companyId, id);
  if (!existingGodown) {
    return res.status(404).json({ message: "Godown not found" });
  }

  // Prevent circular reference
  if (updates.parentGodownId === id) {
    return res.status(400).json({
      message: "Godown cannot be its own parent",
    });
  }

  // Validate parent exists if provided
  if (updates.parentGodownId) {
    const parent = await findById(companyId, updates.parentGodownId);
    if (!parent) {
      return res.status(400).json({ message: "Parent godown not found" });
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteGodown = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const existingGodown = await findById(companyId, id);
  if (!existingGodown) {
    return res.status(404).json({ message: "Godown not found" });
  }

  // Check if godown has children
  const hasChildGodowns = await hasChildren(companyId, id);
  if (hasChildGodowns) {
    return res.status(400).json({
      message: "Cannot delete godown that has child godowns",
    });
  }

  // Check if godown has stock allocated
  const hasStock = await isGodownUsed(companyId, id);
  if (hasStock) {
    return res.status(400).json({
      message: "Cannot delete godown that has stock allocated",
    });
  }

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Godown not found" });
  }

  return res.json({ message: "Godown deleted successfully" });
});

