import { Router } from "express";
import { createSales } from "./controller.js";
import { requireActiveSubscription } from "../../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/", requireActiveSubscription, createSales);

export default router;

