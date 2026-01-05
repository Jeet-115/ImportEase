import {
  findAll,
  findById,
  findByItemId,
  findByType,
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
    console.error("[BOMsController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllBOMs = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, type } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  let boms = await findAll(companyId);

  if (itemId) {
    boms = await findByItemId(companyId, itemId);
  } else if (type) {
    boms = await findByType(companyId, type);
  }

  return res.json(boms || []);
});

export const getBOM = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const bom = await findById(companyId, id);
  if (!bom) {
    return res.status(404).json({ message: "BOM not found" });
  }
  return res.json(bom);
});

export const createBOM = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, name, type, unitOfManufacture, components } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!itemId || !name || !type) {
    return res.status(400).json({ message: "itemId, name, and type are required" });
  }

  if (!["STANDARD", "JOBWORK"].includes(type)) {
    return res.status(400).json({ message: "type must be STANDARD or JOBWORK" });
  }

  // Validate item exists
  const item = await getStockItemById(companyId, itemId);
  if (!item) {
    return res.status(400).json({ message: "Stock item not found" });
  }

  // Validate components
  if (components && Array.isArray(components)) {
    for (const component of components) {
      if (!component.itemId) {
        return res.status(400).json({ message: "Component itemId is required" });
      }

      const componentItem = await getStockItemById(companyId, component.itemId);
      if (!componentItem) {
        return res.status(400).json({ message: `Component item ${component.itemId} not found` });
      }

      if (!["COMPONENT", "BYPRODUCT", "COPRODUCT", "SCRAP"].includes(component.type)) {
        return res.status(400).json({ message: `Invalid component type: ${component.type}` });
      }

      if (component.godownId) {
        const godown = await getGodownById(companyId, component.godownId);
        if (!godown) {
          return res.status(400).json({ message: `Component godown ${component.godownId} not found` });
        }
      }

      if (!component.qty || component.qty <= 0) {
        return res.status(400).json({ message: "Component qty must be greater than 0" });
      }
    }
  }

  const bom = await create(companyId, {
    itemId,
    name,
    type,
    unitOfManufacture: unitOfManufacture || null,
    components: components || [],
  });

  return res.status(201).json(bom);
});

export const updateBOM = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingBOM = await findById(companyId, id);
  if (!existingBOM) {
    return res.status(404).json({ message: "BOM not found" });
  }

  // Validate type if changing
  if (updates.type && !["STANDARD", "JOBWORK"].includes(updates.type)) {
    return res.status(400).json({ message: "type must be STANDARD or JOBWORK" });
  }

  // Validate item if changing
  if (updates.itemId) {
    const item = await getStockItemById(companyId, updates.itemId);
    if (!item) {
      return res.status(400).json({ message: "Stock item not found" });
    }
  }

  // Validate components if updating
  if (updates.components && Array.isArray(updates.components)) {
    for (const component of updates.components) {
      if (!component.itemId) {
        return res.status(400).json({ message: "Component itemId is required" });
      }

      const componentItem = await getStockItemById(companyId, component.itemId);
      if (!componentItem) {
        return res.status(400).json({ message: `Component item ${component.itemId} not found` });
      }

      if (!["COMPONENT", "BYPRODUCT", "COPRODUCT", "SCRAP"].includes(component.type)) {
        return res.status(400).json({ message: `Invalid component type: ${component.type}` });
      }

      if (component.godownId) {
        const godown = await getGodownById(companyId, component.godownId);
        if (!godown) {
          return res.status(400).json({ message: `Component godown ${component.godownId} not found` });
        }
      }

      if (!component.qty || component.qty <= 0) {
        return res.status(400).json({ message: "Component qty must be greater than 0" });
      }
    }
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const deleteBOM = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "BOM not found" });
  }

  return res.json({ message: "BOM deleted successfully" });
});

