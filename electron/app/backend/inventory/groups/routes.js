import { Router } from "express";
import {
  createGroup,
  deleteGroup,
  getGroupById,
  getGroups,
  updateGroup,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getGroups);
router.get("/:id", getGroupById);
router.post("/", requireActiveSubscription, createGroup);
router.put("/:id", requireActiveSubscription, updateGroup);
router.delete("/:id", requireActiveSubscription, deleteGroup);

export default router;

