import { Router } from "express";
import {
  createGodown,
  deleteGodown,
  getGodownById,
  getGodowns,
  updateGodown,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getGodowns);
router.get("/:id", getGodownById);
router.post("/", requireActiveSubscription, createGodown);
router.put("/:id", requireActiveSubscription, updateGodown);
router.delete("/:id", requireActiveSubscription, deleteGodown);

export default router;

