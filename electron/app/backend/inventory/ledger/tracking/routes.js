import { Router } from "express";
import {
  getAllTrackingNumbers,
  getTrackingNumber,
  createTrackingNumber,
  updateTrackingNumber,
  closeTrackingNumber,
} from "./controller.js";
import { requireActiveSubscription } from "../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getAllTrackingNumbers);
router.get("/:trackingNo", getTrackingNumber);
router.post("/", requireActiveSubscription, createTrackingNumber);
router.put("/:trackingNo", requireActiveSubscription, updateTrackingNumber);
router.post("/:trackingNo/close", requireActiveSubscription, closeTrackingNumber);

export default router;

