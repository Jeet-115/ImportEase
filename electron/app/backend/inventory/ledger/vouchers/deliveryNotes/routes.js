import { Router } from "express";
import { createDeliveryNote } from "./controller.js";
import { requireActiveSubscription } from "../../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/", requireActiveSubscription, createDeliveryNote);

export default router;

