import { Router } from "express";
import {
  createUnit,
  deleteUnit,
  getSimpleUnits,
  getUnitById,
  getUnits,
  updateUnit,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getUnits);
router.get("/simple", getSimpleUnits);
router.get("/:id", getUnitById);
router.post("/", requireActiveSubscription, createUnit);
router.put("/:id", requireActiveSubscription, updateUnit);
router.delete("/:id", requireActiveSubscription, deleteUnit);

export default router;

