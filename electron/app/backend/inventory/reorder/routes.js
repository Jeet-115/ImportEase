import { Router } from "express";
import { getReorderAlerts } from "./controller.js";

const router = Router({ mergeParams: true });

router.get("/alerts", getReorderAlerts);

export default router;

