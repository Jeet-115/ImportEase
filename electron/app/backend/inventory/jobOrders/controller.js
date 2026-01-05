import {
  findAll,
  findById,
  findByPartyId,
  findByType,
  findByStatus,
  create,
  updateById,
  closeOrder,
  openOrder,
  deleteById,
} from "./model.js";
import { getFeatures } from "../features/model.js";
import { getStockItemById } from "../items/model.js";
import { getGodownById } from "../godowns/model.js";
import { findById as findBOMById } from "../boms/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[JobOrdersController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllJobOrders = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { partyId, type, status } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Check if job work is enabled
  const features = await getFeatures(companyId);
  if (!features.enableJobWork) {
    return res.status(403).json({ message: "Job Work feature is not enabled for this company" });
  }

  let orders = await findAll(companyId);

  if (partyId) {
    orders = await findByPartyId(companyId, partyId);
  } else if (type) {
    orders = await findByType(companyId, type);
  } else if (status) {
    orders = await findByStatus(companyId, status);
  }

  return res.json(orders || []);
});

export const getJobOrder = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const features = await getFeatures(companyId);
  if (!features.enableJobWork) {
    return res.status(403).json({ message: "Job Work feature is not enabled for this company" });
  }

  const order = await findById(companyId, id);
  if (!order) {
    return res.status(404).json({ message: "Job order not found" });
  }
  return res.json(order);
});

export const createJobOrder = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { type, partyId, processDuration, processNature, items } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Check if job work is enabled
  const features = await getFeatures(companyId);
  if (!features.enableJobWork) {
    return res.status(403).json({ message: "Job Work feature is not enabled for this company" });
  }

  if (!type || !["OUT", "IN"].includes(type)) {
    return res.status(400).json({ message: "type must be OUT or IN" });
  }

  if (!partyId) {
    return res.status(400).json({ message: "partyId is required" });
  }

  // Validate items
  if (items && Array.isArray(items)) {
    for (const item of items) {
      if (item.finishedItemId) {
        const finishedItem = await getStockItemById(companyId, item.finishedItemId);
        if (!finishedItem) {
          return res.status(400).json({ message: `Finished item ${item.finishedItemId} not found` });
        }
      }

      if (item.godownId) {
        const godown = await getGodownById(companyId, item.godownId);
        if (!godown) {
          return res.status(400).json({ message: `Godown ${item.godownId} not found` });
        }
      }

      if (item.bomId) {
        const bom = await findBOMById(companyId, item.bomId);
        if (!bom) {
          return res.status(400).json({ message: `BOM ${item.bomId} not found` });
        }
      }

      // Validate components
      if (item.components && Array.isArray(item.components)) {
        for (const component of item.components) {
          if (component.itemId) {
            const componentItem = await getStockItemById(companyId, component.itemId);
            if (!componentItem) {
              return res.status(400).json({ message: `Component item ${component.itemId} not found` });
            }
          }

          if (component.godownId) {
            const godown = await getGodownById(companyId, component.godownId);
            if (!godown) {
              return res.status(400).json({ message: `Component godown ${component.godownId} not found` });
            }
          }

          if (!["PENDING_ISSUE", "PENDING_RECEIVE"].includes(component.track)) {
            return res.status(400).json({ message: `Invalid component track: ${component.track}` });
          }
        }
      }
    }
  }

  const order = await create(companyId, {
    type,
    partyId,
    processDuration: processDuration || null,
    processNature: processNature || null,
    items: items || [],
  });

  return res.status(201).json(order);
});

export const updateJobOrder = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const features = await getFeatures(companyId);
  if (!features.enableJobWork) {
    return res.status(403).json({ message: "Job Work feature is not enabled for this company" });
  }

  const existingOrder = await findById(companyId, id);
  if (!existingOrder) {
    return res.status(404).json({ message: "Job order not found" });
  }

  // Don't allow changing status via update - use close/open endpoints
  if (updates.status) {
    delete updates.status;
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const closeJobOrder = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const features = await getFeatures(companyId);
  if (!features.enableJobWork) {
    return res.status(403).json({ message: "Job Work feature is not enabled for this company" });
  }

  const order = await findById(companyId, id);
  if (!order) {
    return res.status(404).json({ message: "Job order not found" });
  }

  const updated = await closeOrder(companyId, id);
  return res.json(updated);
});

export const openJobOrder = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const features = await getFeatures(companyId);
  if (!features.enableJobWork) {
    return res.status(403).json({ message: "Job Work feature is not enabled for this company" });
  }

  const order = await findById(companyId, id);
  if (!order) {
    return res.status(404).json({ message: "Job order not found" });
  }

  const updated = await openOrder(companyId, id);
  return res.json(updated);
});

export const deleteJobOrder = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const features = await getFeatures(companyId);
  if (!features.enableJobWork) {
    return res.status(403).json({ message: "Job Work feature is not enabled for this company" });
  }

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Job order not found" });
  }

  return res.json({ message: "Job order deleted successfully" });
});

