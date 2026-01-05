import { Router } from "express";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";
import * as partyController from "./partyController.js";

const router = Router({ mergeParams: true });

router.get("/", requireActiveSubscription, partyController.getAll);
router.get("/:id", requireActiveSubscription, partyController.getById);
router.post("/", requireActiveSubscription, partyController.create);
router.put("/:id", requireActiveSubscription, partyController.update);
router.delete("/:id", requireActiveSubscription, partyController.remove);

export default router;

