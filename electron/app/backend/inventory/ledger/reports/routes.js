import { Router } from "express";
import {
  getStockSummary,
  getBatchSummary,
  getGodownSummary,
  getNegativeStock,
  getSalesBillsPending,
  getPurchaseBillsPending,
  getJobworkOutstanding,
} from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/stock-summary", getStockSummary);
router.get("/batch-summary", getBatchSummary);
router.get("/godown-summary", getGodownSummary);
router.get("/negative-stock", getNegativeStock);
router.get("/sales-bills-pending", getSalesBillsPending);
router.get("/purchase-bills-pending", getPurchaseBillsPending);
router.get("/jobwork-outstanding", getJobworkOutstanding);

export default router;

