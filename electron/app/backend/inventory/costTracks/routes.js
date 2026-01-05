import { Router } from "express";
import {
  getAllCostTracks,
  getCostTrack,
  createCostTrack,
  updateCostTrack,
  addMovementToTrack,
  closeCostTrack,
  openCostTrack,
  deleteCostTrack,
  getCostSummary,
  getCostTrackBreakup,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getAllCostTracks);
router.get("/summary", getCostSummary);
router.get("/:id", getCostTrack);
router.get("/:id/breakup", getCostTrackBreakup);
router.post("/", requireActiveSubscription, createCostTrack);
router.put("/:id", requireActiveSubscription, updateCostTrack);
router.post("/:id/movements", requireActiveSubscription, addMovementToTrack);
router.post("/:id/close", requireActiveSubscription, closeCostTrack);
router.post("/:id/open", requireActiveSubscription, openCostTrack);
router.delete("/:id", requireActiveSubscription, deleteCostTrack);

export default router;

