import { Router } from "express";
import {
  getAllMaterialMovements,
  getMaterialMovement,
  createMaterialMovement,
  updateMaterialMovement,
  deleteMaterialMovement,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getAllMaterialMovements);
router.get("/:id", getMaterialMovement);
router.post("/", requireActiveSubscription, createMaterialMovement);
router.put("/:id", requireActiveSubscription, updateMaterialMovement);
router.delete("/:id", requireActiveSubscription, deleteMaterialMovement);

export default router;

