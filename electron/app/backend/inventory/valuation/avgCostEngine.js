import { loadOrderedTx } from "./valuationEngine.js";

// Weighted average cost engine
export const computeAverageCost = async (
  companyId,
  { itemId, godownId, batchId = null, date = null },
) => {
  const txs = await loadOrderedTx(companyId, {
    itemId,
    godownId,
    batchId,
    date,
  });

  let totalQty = 0;
  let totalVal = 0;
  for (const tx of txs) {
    if (tx.qty > 0) {
      totalQty += tx.qty;
      totalVal += tx.qty * tx.rate;
    }
  }

  const avgCost = totalQty > 0 ? totalVal / totalQty : 0;
  return {
    avgCost,
    avgValue: avgCost * totalQty,
    inwardQty: totalQty,
  };
};


