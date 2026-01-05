import { Router } from "express";
import { getAll, getById, create, update, remove, getBudgetVariance } from "./budgetController.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", requireActiveSubscription, getAll);
router.get("/:budgetId", requireActiveSubscription, getById);
router.post("/", requireActiveSubscription, create);
router.put("/:budgetId", requireActiveSubscription, update);
router.delete("/:budgetId", requireActiveSubscription, remove);
router.get("/reports/variance", requireActiveSubscription, getBudgetVariance);

export default router;


