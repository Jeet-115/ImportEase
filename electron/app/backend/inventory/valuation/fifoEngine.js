import { loadOrderedTx } from "./valuationEngine.js";

// Build FIFO layers and closing quantity/value for an item/godown/batch
export const buildFifoLayers = async (
  companyId,
  { itemId, godownId, batchId = null, date = null },
) => {
  const txs = await loadOrderedTx(companyId, {
    itemId,
    godownId,
    batchId,
    date,
  });

  const layers = [];

  const resetToPhysical = (qty) => {
    const totalQty = layers.reduce((s, l) => s + l.qty, 0);
    const totalVal = layers.reduce((s, l) => s + l.qty * l.rate, 0);
    const avgRate = totalQty > 0 ? totalVal / totalQty : 0;
    layers.length = 0;
    if (qty > 0) {
      layers.push({
        qty,
        rate: avgRate,
        sourceVoucherId: "PHYSICAL",
      });
    }
  };

  for (const tx of txs) {
    if (tx.voucherType === "PHYSICAL" && tx.mode === "ABSOLUTE") {
      resetToPhysical(tx.qty);
      continue;
    }

    if (tx.qty > 0) {
      // Inward movement creates a new layer
      layers.push({
        qty: tx.qty,
        rate: tx.rate,
        sourceVoucherId: tx.voucherId,
      });
    } else if (tx.qty < 0) {
      // Outward movement consumes from oldest layers
      let remaining = -tx.qty;
      for (const layer of layers) {
        if (remaining <= 0) break;
        const take = Math.min(layer.qty, remaining);
        layer.qty -= take;
        remaining -= take;
      }
      // Remove empty layers
      for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].qty <= 1e-9) {
          layers.splice(i, 1);
        }
      }
    }
  }

  const qty = layers.reduce((s, l) => s + l.qty, 0);
  const fifoValue = layers.reduce((s, l) => s + l.qty * l.rate, 0);

  return { qty, fifoLayers: layers, fifoValue };
};


