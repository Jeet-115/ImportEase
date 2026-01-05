import { getItemMetaById } from "./itemMeta.js";

// Standard cost engine (for closing stock valuation)
export const computeStandardCost = async (
  companyId,
  itemId,
  date = null,
) => {
  const meta = await getItemMetaById(companyId, itemId);
  const list = meta?.standardCostRates || [];

  if (!list.length) {
    return { standardCostRate: 0 };
  }

  const valid = list
    .filter((r) => !date || r.fromDate <= date)
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate));

  const chosen = valid[valid.length - 1];
  const rate = chosen ? Number(chosen.rate) : 0;

  return { standardCostRate: rate };
};


