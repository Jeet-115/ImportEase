import { findAllTransactions } from "../ledger/transactions/model.js";

// Profit engine based on FIFO consumption
// For each sales transaction (voucherType === "SALES"), compute COGS and profit.

export const computeProfitReport = async (companyId) => {
  const txs = await findAllTransactions(companyId);

  // Sort globally by date + txId to mimic Tally chronological processing
  txs.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.txId.localeCompare(b.txId);
  });

  // Maintain FIFO layers per item+godown+batch
  const layersByKey = new Map();
  const profitLines = [];

  const keyOf = (tx) =>
    `${tx.itemId}|${tx.godownId || ""}|${tx.batchId || ""}`;

  for (const tx of txs) {
    const key = keyOf(tx);
    let layers = layersByKey.get(key);
    if (!layers) {
      layers = [];
      layersByKey.set(key, layers);
    }

    if (tx.voucherType === "PHYSICAL" && tx.mode === "ABSOLUTE") {
      // Reset layers to physical count at weighted average
      const totalQty = layers.reduce((s, l) => s + l.qty, 0);
      const totalVal = layers.reduce((s, l) => s + l.qty * l.rate, 0);
      const avgRate = totalQty > 0 ? totalVal / totalQty : 0;
      layers.length = 0;
      if (tx.qty > 0) {
        layers.push({
          qty: tx.qty,
          rate: avgRate,
          sourceVoucherId: tx.voucherId,
        });
      }
      continue;
    }

    if (tx.qty > 0) {
      // Inward
      layers.push({
        qty: tx.qty,
        rate: tx.rate,
        sourceVoucherId: tx.voucherId,
      });
      continue;
    }

    if (tx.qty < 0) {
      const outQty = -tx.qty;

      // Outward consumption from layers
      let remaining = outQty;
      let consumedValue = 0;

      for (const layer of layers) {
        if (remaining <= 0) break;
        const take = Math.min(layer.qty, remaining);
        if (take > 0) {
          consumedValue += take * layer.rate;
          layer.qty -= take;
          remaining -= take;
        }
      }

      // Drop empty layers
      for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].qty <= 1e-9) {
          layers.splice(i, 1);
        }
      }

      if (tx.voucherType === "SALES") {
        const saleQty = outQty;
        const saleValue = saleQty * (tx.rate || 0);
        const cogs = consumedValue;
        const profit = saleValue - cogs;

        profitLines.push({
          voucherId: tx.voucherId,
          itemId: tx.itemId,
          date: tx.date,
          qty: saleQty,
          saleRate: tx.rate,
          saleValue,
          cogs,
          profit,
          godownId: tx.godownId || null,
          batchId: tx.batchId || null,
        });
      }
    }
  }

  return profitLines;
};


