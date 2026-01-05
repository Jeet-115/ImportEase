import { getFeatures, updateFeatures } from "./model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[InventoryFeaturesController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getInventoryFeatures = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const features = await getFeatures(companyId);
  return res.json(features);
});

export const updateInventoryFeatures = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const updates = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!updates || typeof updates !== "object") {
    return res.status(400).json({ message: "Invalid updates object" });
  }

  // Validate feature flags are booleans
  const validFlags = [
    "enableBatchTracking",
    "enableExpiry",
    "enableBOM",
    "enableReorder",
    "enablePriceLevels",
    "enableCostTracking",
    "enableJobWork",
    "enableMaterialInOut",
  ];

  for (const key of Object.keys(updates)) {
    if (!validFlags.includes(key)) {
      return res.status(400).json({ message: `Invalid feature flag: ${key}` });
    }
    if (typeof updates[key] !== "boolean") {
      return res.status(400).json({ message: `Feature flag ${key} must be a boolean` });
    }
  }

  const updated = await updateFeatures(companyId, updates);
  return res.json(updated);
});

