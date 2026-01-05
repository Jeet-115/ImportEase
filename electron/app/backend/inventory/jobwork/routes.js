import { Router } from "express";
import {
  getOrdersSummary,
  getComponentsOutstanding,
  getMaterialInRegister,
  getMaterialOutRegister,
  getMaterialMovementRegister,
  getIssueVariance,
  getReceiptVariance,
} from "./reports.js";

const router = Router({ mergeParams: true });

router.get("/orders-summary", getOrdersSummary);
router.get("/components-outstanding", getComponentsOutstanding);
router.get("/material-in-register", getMaterialInRegister);
router.get("/material-out-register", getMaterialOutRegister);
router.get("/material-movement-register", getMaterialMovementRegister);
router.get("/issue-variance", getIssueVariance);
router.get("/receipt-variance", getReceiptVariance);

export default router;

