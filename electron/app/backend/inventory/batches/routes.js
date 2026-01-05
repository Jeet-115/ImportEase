import { Router } from "express";
import {
  getAllBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getAllBatches);
router.get("/:id", getBatch);
router.post("/", requireActiveSubscription, createBatch);
router.put("/:id", requireActiveSubscription, updateBatch);
router.delete("/:id", requireActiveSubscription, deleteBatch);

export default router;

