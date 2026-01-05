import { Router } from "express";
import { createMaterialOut } from "./controller.js";
import { requireActiveSubscription } from "../../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/", requireActiveSubscription, createMaterialOut);

export default router;

