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

  // TODO: Calculate actuals from vouchers
  // For now, return budget with variance = 0
  for (const budget of budgets) {
    const actual = 0; // Calculate from vouchers
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


