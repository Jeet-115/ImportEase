import {
  findAll,
  findById,
  findByItemId,
  findByPartyId,
  findByStatus,
  create,
  updateById,
  addMovement,
  closeTrack,
  openTrack,
  deleteById,
} from "./model.js";
import { findAll as findAllItems } from "../items/model.js";
import { findAll as findAllGroups } from "../groups/model.js";
import { findAll as findAllCategories } from "../categories/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[CostTracksController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllCostTracks = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, partyId, status } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  let tracks = await findAll(companyId);

  if (itemId) {
    tracks = await findByItemId(companyId, itemId);
  } else if (partyId) {
    tracks = await findByPartyId(companyId, partyId);
  } else if (status) {
    tracks = await findByStatus(companyId, status);
  }

  return res.json(tracks || []);
});

export const getCostTrack = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const track = await findById(companyId, id);
  if (!track) {
    return res.status(404).json({ message: "Cost track not found" });
  }
  return res.json(track);
});

export const createCostTrack = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, partyId, createdFromVoucher } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!itemId) {
    return res.status(400).json({ message: "itemId is required" });
  }

  const track = await create(companyId, {
    itemId,
    partyId: partyId || null,
    createdFromVoucher: createdFromVoucher || null,
  });

  return res.status(201).json(track);
});

export const updateCostTrack = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const updates = req.body;

  const existingTrack = await findById(companyId, id);
  if (!existingTrack) {
    return res.status(404).json({ message: "Cost track not found" });
  }

  // Don't allow changing status via update - use close/open endpoints
  if (updates.status) {
    delete updates.status;
  }

  const updated = await updateById(companyId, id, updates);
  return res.json(updated);
});

export const addMovementToTrack = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const { type, voucherId, qty, amount } = req.body;

  if (!companyId || !id) {
    return res.status(400).json({ message: "companyId and trackId are required" });
  }

  if (!type || !voucherId || qty === undefined || amount === undefined) {
    return res.status(400).json({ message: "type, voucherId, qty, and amount are required" });
  }

  const movement = {
    type,
    voucherId,
    qty: Number(qty),
    amount: Number(amount),
    date: new Date().toISOString(),
  };

  const updated = await addMovement(companyId, id, movement);
  return res.json(updated);
});

export const closeCostTrack = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const track = await findById(companyId, id);
  if (!track) {
    return res.status(404).json({ message: "Cost track not found" });
  }

  const updated = await closeTrack(companyId, id);
  return res.json(updated);
});

export const openCostTrack = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const track = await findById(companyId, id);
  if (!track) {
    return res.status(404).json({ message: "Cost track not found" });
  }

  const updated = await openTrack(companyId, id);
  return res.json(updated);
});

export const deleteCostTrack = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const deleted = await deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Cost track not found" });
  }

  return res.json({ message: "Cost track deleted successfully" });
});

// Reports
export const getCostSummary = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { groupBy } = req.query; // "item", "group", "category"

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const tracks = await findAll(companyId);
  const items = await findAllItems(companyId);
  const groups = await findAllGroups(companyId);
  const categories = await findAllCategories(companyId);

  const summary = {};

  for (const track of tracks) {
    if (track.status !== "OPEN") continue;

    const item = items.find((i) => i.id === track.itemId);
    if (!item) continue;

    let key;
    if (groupBy === "group" && item.groupId) {
      const group = groups.find((g) => g.id === item.groupId);
      key = group ? group.name : "Ungrouped";
    } else if (groupBy === "category" && item.categoryId) {
      const category = categories.find((c) => c.id === item.categoryId);
      key = category ? category.name : "Uncategorized";
    } else {
      key = item.name;
    }

    if (!summary[key]) {
      summary[key] = {
        key,
        itemCount: 0,
        trackCount: 0,
        totalQty: 0,
        totalAmount: 0,
      };
    }

    summary[key].itemCount += 1;
    summary[key].trackCount += 1;

    for (const movement of track.movements || []) {
      summary[key].totalQty += movement.qty || 0;
      summary[key].totalAmount += movement.amount || 0;
    }
  }

  return res.json(Object.values(summary));
});

export const getCostTrackBreakup = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;

  const track = await findById(companyId, id);
  if (!track) {
    return res.status(404).json({ message: "Cost track not found" });
  }

  const items = await findAllItems(companyId);
  const item = items.find((i) => i.id === track.itemId);

  const breakup = {
    trackId: track.trackId,
    itemId: track.itemId,
    itemName: item?.name || "Unknown",
    partyId: track.partyId,
    status: track.status,
    createdFromVoucher: track.createdFromVoucher,
    movements: track.movements || [],
    totals: {
      totalQty: 0,
      totalAmount: 0,
      avgRate: 0,
    },
  };

  for (const movement of track.movements || []) {
    breakup.totals.totalQty += movement.qty || 0;
    breakup.totals.totalAmount += movement.amount || 0;
  }

  if (breakup.totals.totalQty > 0) {
    breakup.totals.avgRate = breakup.totals.totalAmount / breakup.totals.totalQty;
  }

  return res.json(breakup);
});

