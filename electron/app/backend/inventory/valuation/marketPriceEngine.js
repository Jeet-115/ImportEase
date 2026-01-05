import { loadOrderedTx } from "./valuationEngine.js";
import { getItemMetaById } from "./itemMeta.js";

// Market price engine (sales-based and standard selling rates)
export const computeMarketPrice = async (
  companyId,
  { itemId, godownId, batchId = null, date = null },
) => {
  const meta = await getItemMetaById(companyId, itemId);
  const method = meta?.marketValuationMethod || "ZERO";

  if (method === "ZERO") {
    return { marketRate: 0 };
  }

  if (method === "STANDARD_SALE") {
    const list = meta.standardSellingRates || [];
    if (!list.length) return { marketRate: 0 };

    const valid = list
      .filter((r) => !date || r.fromDate <= date)
      .sort((a, b) => a.fromDate.localeCompare(b.fromDate));

    const chosen = valid[valid.length - 1];
    const rate = chosen ? Number(chosen.rate) : 0;
    return { marketRate: rate };
  }

  // Sales-based methods
  const txs = await loadOrderedTx(companyId, {
    itemId,
    godownId,
    batchId,
    date,
  });

  const sales = txs.filter(
    (tx) => tx.voucherType === "SALES" && tx.qty < 0,
  );
  if (!sales.length) return { marketRate: 0 };

  if (method === "LAST_SALE") {
    const last = sales[sales.length - 1];
    return { marketRate: Number(last.rate) || 0 };
  }

  if (method === "AVG_SALE") {
    let totalQty = 0;
    let totalVal = 0;
    for (const tx of sales) {
      const q = -tx.qty;
      totalQty += q;
      totalVal += q * tx.rate;
    }
    const rate = totalQty > 0 ? totalVal / totalQty : 0;
    return { marketRate: rate };
  }

  return { marketRate: 0 };
};


