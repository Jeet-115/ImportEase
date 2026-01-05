import { Router } from "express";
import { createPhysicalStock } from "./controller.js";
import { requireActiveSubscription } from "../../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/", requireActiveSubscription, createPhysicalStock);

export default router;

