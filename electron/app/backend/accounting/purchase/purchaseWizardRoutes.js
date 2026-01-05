import { Router } from "express";
import { createPurchaseWizard } from "./purchaseWizardController.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/wizard", requireActiveSubscription, createPurchaseWizard);

export default router;


