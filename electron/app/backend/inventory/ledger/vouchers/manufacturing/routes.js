import { Router } from "express";
import { createManufacturing } from "./controller.js";
import { requireActiveSubscription } from "../../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/", requireActiveSubscription, createManufacturing);

export default router;

