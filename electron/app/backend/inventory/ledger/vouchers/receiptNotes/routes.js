import { Router } from "express";
import { createReceiptNote } from "./controller.js";
import { requireActiveSubscription } from "../../../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.post("/", requireActiveSubscription, createReceiptNote);

export default router;

