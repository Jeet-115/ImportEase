import { findAll as findAllItems } from "../items/model.js";
import { findAll as findAllGodowns } from "../godowns/model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[ReorderController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getReorderAlerts = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const items = await findAllItems(companyId);
  const godowns = await findAllGodowns(companyId);

  const alerts = [];

  for (const item of items) {
    // Skip items without reorder settings
    if (!item.reorderLevel || item.reorderLevel <= 0) {
      continue;
    }

    // Calculate available quantity from opening balance
    let availableQty = 0;
    const godownAllocations = item.openingBalance?.godownAllocations || [];

    if (godownAllocations.length > 0) {
      // If item has specific godown allocations, check each godown
      if (item.reorderGodownId) {
        // Check specific reorder godown
        const allocation = godownAllocations.find(
          (alloc) => alloc.godownId === item.reorderGodownId
        );
        availableQty = allocation?.quantity || 0;
      } else {
        // Sum all godown allocations
        availableQty = godownAllocations.reduce(
          (sum, alloc) => sum + (alloc.quantity || 0),
          0
        );
      }
    } else {
      // Use overall opening balance quantity
      availableQty = item.openingBalance?.quantity || 0;
    }

    const reorderLevel = item.reorderLevel || 0;
    const shortage = reorderLevel - availableQty;

    if (shortage > 0) {
      const godownId = item.reorderGodownId || null;
      const godown = godownId
        ? godowns.find((g) => g.id === godownId)
        : null;

      alerts.push({
        itemId: item.id,
        itemName: item.name,
        itemAlias: item.alias || "",
        godownId: godownId,
        godownName: godown?.name || "All Godowns",
        availableQty: availableQty,
        reorderLevel: reorderLevel,
        reorderQty: item.reorderQty || 0,
        shortage: shortage,
      });
    }
  }

  // Sort by shortage (highest first)
  alerts.sort((a, b) => b.shortage - a.shortage);

  return res.json(alerts);
});

