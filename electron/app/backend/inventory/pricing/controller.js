import {
  getPricing,
  updatePricing,
  addPriceLevel,
  removePriceLevel,
  setItemPrice,
  removeItemPrice,
} from "./model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[PricingController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getCompanyPricing = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const pricing = await getPricing(companyId);
  return res.json(pricing);
});

export const updateCompanyPricing = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const updates = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const updated = await updatePricing(companyId, updates);
  return res.json(updated);
});

export const addLevel = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { levelName } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!levelName || typeof levelName !== "string" || !levelName.trim()) {
    return res.status(400).json({ message: "levelName is required and must be a non-empty string" });
  }

  const updated = await addPriceLevel(companyId, levelName.trim());
  return res.json(updated);
});

export const removeLevel = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { levelName } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!levelName || typeof levelName !== "string") {
    return res.status(400).json({ message: "levelName is required" });
  }

  const updated = await removePriceLevel(companyId, levelName);
  return res.json(updated);
});

export const setPrice = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, level, rate } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!itemId || !level || rate === undefined) {
    return res.status(400).json({ message: "itemId, level, and rate are required" });
  }

  if (typeof rate !== "number" || rate < 0) {
    return res.status(400).json({ message: "rate must be a non-negative number" });
  }

  const updated = await setItemPrice(companyId, itemId, level, rate);
  return res.json(updated);
});

export const removePrice = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { itemId, level } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!itemId || !level) {
    return res.status(400).json({ message: "itemId and level are required" });
  }

  const updated = await removeItemPrice(companyId, itemId, level);
  return res.json(updated);
});

