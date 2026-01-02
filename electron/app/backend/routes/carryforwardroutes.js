import { Router } from "express";
import {
  getCarryForwardPendingRows,
  applyCarryForwardRows,
} from "../controllers/carryforwardcontroller.js";
import { requireActiveSubscription } from "../middleware/softwareAuthMiddleware.js";

const router = Router();

// GET /api/carry-forward/:companyId/:type
// Returns pending rows from previous months
router.get(
  "/:companyId/:type",
  requireActiveSubscription,
  getCarryForwardPendingRows
);

// POST /api/carry-forward/apply
// Adds selected pending rows to current month
router.post(
  "/apply",
  requireActiveSubscription,
  applyCarryForwardRows
);

export default router;

