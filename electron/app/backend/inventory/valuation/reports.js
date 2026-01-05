import { computeStock } from "../ledger/transactions/model.js";
import { computeStockForAllItems } from "../ledger/transactions/model.js";
import { getItemMetaById } from "./itemMeta.js";
import { buildFifoLayers } from "./fifoEngine.js";
import { computeAverageCost } from "./avgCostEngine.js";
import { computeLastPurchase } from "./lastPurchaseEngine.js";
import { computeStandardCost } from "./standardCostEngine.js";
import { computeMarketPrice } from "./marketPriceEngine.js";
import { computeProfitReport } from "./profitEngine.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[ValuationReports] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

// Build a full valuation snapshot for a single item (all methods)
export const getItemValuation = async (
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

// GET /api/inventory/:companyId/stock-summary?method=FIFO|AVG|LAST|STD
export const getStockSummary = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const method = (req.query.method || "FIFO").toUpperCase();
  const txGroups = await computeStockForAllItems(companyId);

  const rows = [];

  for (const g of txGroups) {
    const { itemId, godownId, batchId, stock } = g;
    if (!itemId || !stock || stock <= 0) continue;

    let rate = 0;
    let value = 0;

    const filter = {
      itemId,
      godownId: g.godownId,
      batchId: g.batchId === "null" ? null : g.batchId,
      date: null,
    };

    if (method === "FIFO") {
      const fifo = await buildFifoLayers(companyId, filter);
      const qty = fifo.qty;
      const val = fifo.fifoValue;
      const effQty = qty || 0;
      rate = effQty > 0 ? val / effQty : 0;
      value = rate * effQty;
    } else if (method === "AVG") {
      const avg = await computeAverageCost(companyId, filter);
      const qty = stock;
      const r =
        avg.avgCost !== undefined
          ? avg.avgCost
          : avg.inwardQty > 0
            ? avg.avgValue / avg.inwardQty
            : 0;
      rate = r;
      value = r * qty;
    } else if (method === "LAST") {
      const last = await computeLastPurchase(companyId, filter);
      const r = last.lastPurchaseRate || 0;
      rate = r;
      value = r * stock;
    } else if (method === "STD") {
      const std = await computeStandardCost(companyId, itemId, null);
      const r = std.standardCostRate || 0;
      rate = r;
      value = r * stock;
    } else {
      // default to FIFO if unknown
      const fifo = await buildFifoLayers(companyId, filter);
      const qty = fifo.qty;
      const val = fifo.fifoValue;
      const effQty = qty || 0;
      rate = effQty > 0 ? val / effQty : 0;
      value = rate * effQty;
    }

    rows.push({
      itemId,
      godownId,
      batchId,
      qty: stock,
      rate,
      value,
      method,
    });
  }

  res.json(rows);
});

// GET /api/inventory/:companyId/item/:itemId/valuation
export const getItemValuationHandler = asyncHandler(async (req, res) => {
  const { companyId, itemId } = req.params;
  const valuation = await getItemValuation(companyId, { itemId });
  res.json(valuation);
});

// GET /api/inventory/:companyId/profit-report
export const getProfitReport = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const lines = await computeProfitReport(companyId);
  res.json(lines);
});


