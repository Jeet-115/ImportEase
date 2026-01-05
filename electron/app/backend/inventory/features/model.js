import {
  readInventoryFile,
  writeInventoryFile,
} from "../../storage/inventoryStore.js";

const DEFAULT_FEATURES = {
  enableBatchTracking: false,
  enableExpiry: false,
  enableBOM: false,
  enableReorder: false,
  enablePriceLevels: false,
  enableCostTracking: false,
  enableJobWork: false,
  enableMaterialInOut: false,
};

export const getFeatures = async (companyId) => {
  // For features, we need to handle it specially since it's an object, not array
  const features = await readInventoryFile(companyId, "features.json", DEFAULT_FEATURES);
  
  // Ensure we always return an object with all default keys
  if (!features || Array.isArray(features)) {
    return DEFAULT_FEATURES;
  }
  
  return { ...DEFAULT_FEATURES, ...features };
};

export const updateFeatures = async (companyId, updates) => {
  const current = await getFeatures(companyId);
  
  const merged = { ...current, ...updates };
  
  // Rule: If enableJobWork is true, force enableMaterialInOut to true
  if (merged.enableJobWork === true) {
    merged.enableMaterialInOut = true;
  }
  
  await writeInventoryFile(companyId, "features.json", merged);
  return merged;
};

