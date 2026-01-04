import {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
  hasChildren,
  isGroupUsed,
} from "./model.js";
import { findById as findCompanyById } from "../../models/companymastermodel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("StockGroupsController Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getGroups = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Auto-create file if it doesn't exist - no company validation needed for GET
  const groups = await findAll(companyId);
  return res.json(groups || []);
});

export const getGroupById = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const group = await findById(companyId, id);
  if (!group) {
    return res.status(404).json({ message: "Stock group not found" });
  }
  return res.json(group);
});

export const createGroup = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const groupData = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  if (!groupData.name || !groupData.name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  // Validate parent exists if provided
  if (groupData.parentGroupId) {
    const parent = await findById(companyId, groupData.parentGroupId);
    if (!parent) {
      return res.status(400).json({ message: "Parent group not found" });
    }
  }

  const group = await create(companyId, groupData);
  return res.status(201).json(group);
});

export const updateGroup = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingGroup = await findById(companyId, id);
  if (!existingGroup) {
    return res.status(404).json({ message: "Stock group not found" });
  }

  // Prevent circular reference
  if (updates.parentGroupId === id) {
    return res.status(400).json({
      message: "Group cannot be its own parent",
    });
  }

  // Validate parent exists if provided
  if (updates.parentGroupId) {
    const parent = await findById(companyId, updates.parentGroupId);
    if (!parent) {
      return res.status(400).json({ message: "Parent group not found" });
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteGroup = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const existingGroup = await findById(companyId, id);
  if (!existingGroup) {
    return res.status(404).json({ message: "Stock group not found" });
  }

  // Check if group has children
  const hasChildGroups = await hasChildren(companyId, id);
  if (hasChildGroups) {
    return res.status(400).json({
      message: "Cannot delete group that has child groups",
    });
  }

  // Check if group is used in stock items
  const usedInItems = await isGroupUsed(companyId, id);
  if (usedInItems) {
    return res.status(400).json({
      message: "Cannot delete group that is used in stock items",
    });
  }

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Stock group not found" });
  }

  return res.json({ message: "Stock group deleted successfully" });
});

