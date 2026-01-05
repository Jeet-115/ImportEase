import { Router } from "express";
import { getAll, getByParty, getPartySummary, adjustOutstanding } from "./outstandingController.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", requireActiveSubscription, getAll);
router.get("/party/:partyId", requireActiveSubscription, getByParty);
router.get("/party/:partyId/summary", requireActiveSubscription, getPartySummary);
router.post("/:voucherId/adjust", requireActiveSubscription, adjustOutstanding);

export default router;


