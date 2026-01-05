import { loadOrderedTx } from "./valuationEngine.js";

// Last purchase cost engine
export const computeLastPurchase = async (
  companyId,
  { itemId, godownId, batchId = null, date = null },
) => {
  const txs = await loadOrderedTx(companyId, {
    itemId,
    godownId,
    batchId,
    date,
  });

  const inwardPurchases = txs.filter(
    (tx) =>
      tx.qty > 0 &&
      (tx.voucherType === "PURCHASE" || tx.voucherType === "RECEIPT_NOTE"),
  );

  if (!inwardPurchases.length) {
    return { lastPurchaseRate: 0 };
  }

  const last = inwardPurchases[inwardPurchases.length - 1];
  return { lastPurchaseRate: Number(last.rate) || 0 };
};


