import { Router } from "express";
import { createStockJournal } from "./controller.js";
import { requireActiveSubscription } from "../../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/", requireActiveSubscription, createStockJournal);

export default router;

