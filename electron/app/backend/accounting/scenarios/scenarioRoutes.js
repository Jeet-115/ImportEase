import { Router } from "express";
import { getAll, getById, create, update, remove } from "./scenarioController.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", requireActiveSubscription, getAll);
router.get("/:scenarioId", requireActiveSubscription, getById);
router.post("/", requireActiveSubscription, create);
router.put("/:scenarioId", requireActiveSubscription, update);
router.delete("/:scenarioId", requireActiveSubscription, remove);

export default router;


