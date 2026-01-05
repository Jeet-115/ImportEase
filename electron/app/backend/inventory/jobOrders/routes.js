import { Router } from "express";
import {
  getAllJobOrders,
  getJobOrder,
  createJobOrder,
  updateJobOrder,
  closeJobOrder,
  openJobOrder,
  deleteJobOrder,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getAllJobOrders);
router.get("/:id", getJobOrder);
router.post("/", requireActiveSubscription, createJobOrder);
router.put("/:id", requireActiveSubscription, updateJobOrder);
router.post("/:id/close", requireActiveSubscription, closeJobOrder);
router.post("/:id/open", requireActiveSubscription, openJobOrder);
router.delete("/:id", requireActiveSubscription, deleteJobOrder);

export default router;

