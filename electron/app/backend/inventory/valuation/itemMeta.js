import fs from "node:fs/promises";
import path from "node:path";
import { getBaseDir } from "../../../fileService.js";

const DEFAULT_VALUATION = {
  costingMethod: "FIFO", // "FIFO" | "AVG" | "LAST_PURCHASE" | "STANDARD" | "ZERO"
  marketValuationMethod: "AVG_SALE", // "AVG_SALE" | "LAST_SALE" | "STANDARD_SALE" | "ZERO"
  standardCostRates: [],
  standardSellingRates: [],
};

const getStockItemsPath = (companyId) => {
  const baseDir = getBaseDir();
  return path.join(
    baseDir,
    "companies",
    companyId,
    "inventory",
    "masters",
    "items.json", // inventoryStore collection key "items"
  );
};

export const readItemMeta = async (companyId) => {
  const filePath = getStockItemsPath(companyId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const list = raw.trim() ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.map((it) => ({ ...DEFAULT_VALUATION, ...it }));
  } catch (error) {
    if (error.code === "ENOENT") {
      // No items yet
      return [];
    }
    console.error(
      "[valuation:itemMeta] Failed to read item metadata for company",
      companyId,
      error,
    );
    throw error;
  }
};

export const getItemMetaById = async (companyId, itemId) => {
  const items = await readItemMeta(companyId);
  return items.find((it) => it.id === itemId) || null;
};


