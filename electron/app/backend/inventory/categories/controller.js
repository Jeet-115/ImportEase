import {
  findAll,
  findById,
  create,
  updateById,
  deleteById,
  hasChildren,
  isCategoryUsed,
} from "./model.js";
import { findById as findCompanyById } from "../../models/companymastermodel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("StockCategoriesController Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getCategories = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Auto-create file if it doesn't exist - no company validation needed for GET
  const categories = await findAll(companyId);
  return res.json(categories || []);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const category = await findById(companyId, id);
  if (!category) {
    return res.status(404).json({ message: "Stock category not found" });
  }
  return res.json(category);
});

export const createCategory = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const categoryData = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const company = await findCompanyById(companyId);
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  if (!categoryData.name || !categoryData.name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  // Validate parent exists if provided
  if (categoryData.parentCategoryId) {
    const parent = await findById(companyId, categoryData.parentCategoryId);
    if (!parent) {
      return res.status(400).json({ message: "Parent category not found" });
    }
  }

  const category = await create(companyId, categoryData);
  return res.status(201).json(category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingCategory = await findById(companyId, id);
  if (!existingCategory) {
    return res.status(404).json({ message: "Stock category not found" });
  }

  // Prevent circular reference
  if (updates.parentCategoryId === id) {
    return res.status(400).json({
      message: "Category cannot be its own parent",
    });
  }

  // Validate parent exists if provided
  if (updates.parentCategoryId) {
    const parent = await findById(companyId, updates.parentCategoryId);
    if (!parent) {
      return res.status(400).json({ message: "Parent category not found" });
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const existingCategory = await findById(companyId, id);
  if (!existingCategory) {
    return res.status(404).json({ message: "Stock category not found" });
  }

  // Check if category has children
  const hasChildCategories = await hasChildren(companyId, id);
  if (hasChildCategories) {
    return res.status(400).json({
      message: "Cannot delete category that has child categories",
    });
  }

  // Check if category is used in stock items
  const usedInItems = await isCategoryUsed(companyId, id);
  if (usedInItems) {
    return res.status(400).json({
      message: "Cannot delete category that is used in stock items",
    });
  }

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Stock category not found" });
  }

  return res.json({ message: "Stock category deleted successfully" });
});

