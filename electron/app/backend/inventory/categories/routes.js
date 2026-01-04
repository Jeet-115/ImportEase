import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", requireActiveSubscription, createCategory);
router.put("/:id", requireActiveSubscription, updateCategory);
router.delete("/:id", requireActiveSubscription, deleteCategory);

export default router;

