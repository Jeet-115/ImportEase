import { Router } from "express";
import { createSalesWizard } from "./salesWizardController.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/wizard", requireActiveSubscription, createSalesWizard);

export default router;

