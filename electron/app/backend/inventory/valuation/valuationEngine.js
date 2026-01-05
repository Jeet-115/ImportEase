import { findAllTransactions } from "../ledger/transactions/model.js";
import { buildFifoLayers } from "./fifoEngine.js";
import { computeAverageCost } from "./avgCostEngine.js";
import { computeLastPurchase } from "./lastPurchaseEngine.js";
import { computeStandardCost } from "./standardCostEngine.js";
import { computeMarketPrice } from "./marketPriceEngine.js";

// Load ordered transactions for valuation
export const loadOrderedTx = async (
  companyId,
  { itemId, godownId, batchId, date },
) => {
  const txs = await findAllTransactions(companyId);

  return txs
    .filter((tx) => {
      if (itemId && tx.itemId !== itemId) return false;
      if (godownId && tx.godownId !== godownId) return false;
      if (batchId !== undefined) {
        const b = batchId ?? null;
        if (tx.batchId !== b) return false;
      }
      if (date && tx.date > date) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.txId.localeCompare(b.txId);
    });
};

// High-level valuation entry point
export const getItemValuationSnapshot = async (
  companyId,
  { itemId, godownId = null, batchId = null, date = null },
) => {
  const filter = { itemId, godownId, batchId, date };

  const fifo = await buildFifoLayers(companyId, filter);
  const closingQty = fifo.qty;

  const avg = await computeAverageCost(companyId, filter);
  const avgRate =
    avg.avgCost !== undefined
      ? avg.avgCost
      : avg.inwardQty > 0
        ? avg.avgValue / avg.inwardQty
        : 0;

  const last = await computeLastPurchase(companyId, filter);
  const std = await computeStandardCost(companyId, itemId, date);
  const market = await computeMarketPrice(companyId, {
    itemId,
    godownId,
    batchId,
    date,
  });

  const fifoValue = fifo.fifoValue;
  const avgValue = closingQty * (avgRate || 0);
  const lastRate = last.lastPurchaseRate || 0;
  const lastValue = closingQty * lastRate;
  const stdRate = std.standardCostRate || 0;
  const stdValue = closingQty * stdRate;
  const marketRate = market.marketRate || 0;
  const marketValue = closingQty * marketRate;

  return {
    itemId,
    qty: closingQty,
    fifoLayers: fifo.fifoLayers,
    avgCost: avgRate,
    lastPurchaseRate: lastRate,
    standardCostRate: stdRate,
    fifoValue,
    avgValue,
    lastPurchaseValue: lastValue,
    standardValue: stdValue,
    marketRate,
    marketValue,
  };
};


