import { Router } from "express";
import {
  getInventoryFeatures,
  updateInventoryFeatures,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getInventoryFeatures);
router.put("/", requireActiveSubscription, updateInventoryFeatures);

export default router;

