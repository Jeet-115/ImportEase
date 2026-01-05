import {
  readInventoryFile,
  writeInventoryFile,
} from "../../storage/inventoryStore.js";

const DEFAULT_PRICING = {
  priceLevels: [],
  priceLists: {},
};

export const getPricing = async (companyId) => {
  const pricing = await readInventoryFile(companyId, "pricing.json", DEFAULT_PRICING);
  
  // Ensure we always return an object with all default keys
  if (!pricing || Array.isArray(pricing)) {
    return DEFAULT_PRICING;
  }
  
  return {
    priceLevels: pricing.priceLevels || [],
    priceLists: pricing.priceLists || {},
  };
};

export const updatePricing = async (companyId, updates) => {
  const current = await getPricing(companyId);
  
  const merged = {
    priceLevels: updates.priceLevels !== undefined ? updates.priceLevels : current.priceLevels,
    priceLists: updates.priceLists !== undefined ? updates.priceLists : current.priceLists,
  };
  
  await writeInventoryFile(companyId, "pricing.json", merged);
  return merged;
};

export const addPriceLevel = async (companyId, levelName) => {
  const current = await getPricing(companyId);
  
  if (current.priceLevels.includes(levelName)) {
    throw new Error("Price level already exists");
  }
  
  const updated = {
    ...current,
    priceLevels: [...current.priceLevels, levelName],
  };
  
  await writeInventoryFile(companyId, "pricing.json", updated);
  return updated;
};

export const removePriceLevel = async (companyId, levelName) => {
  const current = await getPricing(companyId);
  
  const updated = {
    priceLevels: current.priceLevels.filter((l) => l !== levelName),
    priceLists: {},
  };
  
  // Remove this level from all price lists
  for (const itemId of Object.keys(current.priceLists)) {
    const itemPrices = { ...current.priceLists[itemId] };
    delete itemPrices[levelName];
    if (Object.keys(itemPrices).length > 0) {
      updated.priceLists[itemId] = itemPrices;
    }
  }
  
  await writeInventoryFile(companyId, "pricing.json", updated);
  return updated;
};

export const setItemPrice = async (companyId, itemId, level, rate) => {
  const current = await getPricing(companyId);
  
  if (!current.priceLevels.includes(level)) {
    throw new Error("Price level does not exist");
  }
  
  const updated = {
    ...current,
    priceLists: {
      ...current.priceLists,
      [itemId]: {
        ...(current.priceLists[itemId] || {}),
        [level]: rate,
      },
    },
  };
  
  await writeInventoryFile(companyId, "pricing.json", updated);
  return updated;
};

export const removeItemPrice = async (companyId, itemId, level) => {
  const current = await getPricing(companyId);
  
  if (!current.priceLists[itemId]) {
    return current;
  }
  
  const itemPrices = { ...current.priceLists[itemId] };
  delete itemPrices[level];
  
  const updated = {
    ...current,
    priceLists: {
      ...current.priceLists,
      [itemId]: Object.keys(itemPrices).length > 0 ? itemPrices : undefined,
    },
  };
  
  // Remove itemId key if no prices left
  if (!updated.priceLists[itemId]) {
    delete updated.priceLists[itemId];
  }
  
  await writeInventoryFile(companyId, "pricing.json", updated);
  return updated;
};

