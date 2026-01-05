import { Router } from "express";
import {
  getStockSummary,
  getItemValuationHandler,
  getProfitReport,
} from "./reports.js";

const router = Router({ mergeParams: true });

router.get("/stock-summary", getStockSummary);
router.get("/item/:itemId/valuation", getItemValuationHandler);
router.get("/profit-report", getProfitReport);

export default router;


