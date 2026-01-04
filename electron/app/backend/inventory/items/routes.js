import { Router } from "express";
import {
  createItem,
  deleteItem,
  getItemById,
  getItems,
  updateItem,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getItems);
router.get("/:id", getItemById);
router.post("/", requireActiveSubscription, createItem);
router.put("/:id", requireActiveSubscription, updateItem);
router.delete("/:id", requireActiveSubscription, deleteItem);

export default router;

