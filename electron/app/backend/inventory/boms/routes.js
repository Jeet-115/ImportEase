import { Router } from "express";
import {
  getAllBOMs,
  getBOM,
  createBOM,
  updateBOM,
  deleteBOM,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getAllBOMs);
router.get("/:id", getBOM);
router.post("/", requireActiveSubscription, createBOM);
router.put("/:id", requireActiveSubscription, updateBOM);
router.delete("/:id", requireActiveSubscription, deleteBOM);

export default router;

