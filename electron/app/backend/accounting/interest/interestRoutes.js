import { Router } from "express";
import { runInterest, postInterestEntry } from "./interestController.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/run", requireActiveSubscription, runInterest);
router.post("/:interestVoucherId/post", requireActiveSubscription, postInterestEntry);

export default router;


