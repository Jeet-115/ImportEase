import * as budgetModel from "./budgetModel.js";
import { readAccountingCollection } from "../../storage/accountingStore.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[BudgetController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAll = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { period } = req.query;
  const budgets = period
    ? await budgetModel.findByPeriod(companyId, period)
    : await budgetModel.findAll(companyId);
  res.json(budgets);
});

export const getById = asyncHandler(async (req, res) => {
  const { companyId, budgetId } = req.params;
  const budget = await budgetModel.findById(companyId, budgetId);
  if (!budget) {
    return res.status(404).json({ message: "Budget not found" });
  }
  res.json(budget);
});

export const create = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const budget = await budgetModel.create(companyId, req.body);
  res.status(201).json(budget);
});

export const update = asyncHandler(async (req, res) => {
  const { companyId, budgetId } = req.params;
  const budget = await budgetModel.updateById(companyId, budgetId, req.body);
  if (!budget) {
    return res.status(404).json({ message: "Budget not found" });
  }
  res.json(budget);
});

export const remove = asyncHandler(async (req, res) => {
  const { companyId, budgetId } = req.params;
  const deleted = await budgetModel.deleteById(companyId, budgetId);
  if (!deleted) {
    return res.status(404).json({ message: "Budget not found" });
  }
  res.json({ success: true });
});

export const getBudgetVariance = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { period } = req.query;

  if (!period) {
    return res.status(400).json({ message: "period query parameter is required" });
  }

  const budgets = await budgetModel.findByPeriod(companyId, period);
  const variances = [];

  // Parse period (e.g., "2025-04" for April 2025)
  const [year, month] = period.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    console.error(`[BudgetController] Invalid period format: ${period}`);
    return res.status(400).json({ message: "Invalid period format. Expected YYYY-MM" });
  }

  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const periodEnd = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;

  // Read accounting vouchers for the period
  let salesVouchers = [];
  let purchaseVouchers = [];
  try {
    salesVouchers = await readAccountingCollection(companyId, "sales", "vouchers");
    purchaseVouchers = await readAccountingCollection(companyId, "purchases", "vouchers");
  } catch (error) {
    console.error(`[BudgetController] Failed to read vouchers for company ${companyId}:`, error);
    // Continue with empty arrays - actuals will be 0
  }

  // Filter vouchers by period
  const periodSales = (salesVouchers || []).filter(
    (v) => v.date >= periodStart && v.date <= periodEnd
  );
  const periodPurchases = (purchaseVouchers || []).filter(
    (v) => v.date >= periodStart && v.date <= periodEnd
  );

  for (const budget of budgets) {
    let actual = 0;

    try {
      if (budget.type === "LEDGER") {
        // Calculate actuals from vouchers matching the ledger
        // For sales: sum totalAmount where party matches or ledger matches
        // For purchases: sum totalAmount where party matches or ledger matches
        for (const voucher of [...periodSales, ...periodPurchases]) {
          // Check if voucher matches the target ledger
          // This is a simplified check - in a full implementation, you'd match against voucher.ledgerId
          if (voucher.ledgerId === budget.targetId || voucher.partyId === budget.targetId) {
            actual += Math.abs(voucher.totalAmount || 0);
          }
        }
      } else if (budget.type === "GROUP") {
        // For stock groups, calculate from inventory transactions
        // This would require reading inventory transactions and matching by item group
        // For now, we'll calculate from sales/purchase vouchers that have items in this group
        const { findAllItems } = await import("../../inventory/items/model.js");
        const items = await findAllItems(companyId);
        const groupItems = items.filter((item) => item.groupId === budget.targetId);

        for (const voucher of [...periodSales, ...periodPurchases]) {
          if (voucher.items && Array.isArray(voucher.items)) {
            for (const item of voucher.items) {
              if (groupItems.some((gi) => gi.id === item.itemId)) {
                actual += Math.abs(item.amount || item.qty * (item.rate || 0) || 0);
              }
            }
          }
        }
      } else {
        // COST_CENTRE or other types - calculate from all vouchers in period
        for (const voucher of [...periodSales, ...periodPurchases]) {
          actual += Math.abs(voucher.totalAmount || 0);
        }
      }
    } catch (error) {
      console.error(`[BudgetController] Error calculating actuals for budget ${budget.id}:`, error);
      // Continue with actual = 0 if calculation fails
      actual = 0;
    }

    const variance = budget.amount - actual;
    const variancePercent = budget.amount > 0 ? (variance / budget.amount) * 100 : 0;

    variances.push({
      ...budget,
      actual,
      variance,
      variancePercent,
    });
  }

  res.json(variances);
});


