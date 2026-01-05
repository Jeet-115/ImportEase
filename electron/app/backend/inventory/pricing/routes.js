import { Router } from "express";
import {
  getCompanyPricing,
  updateCompanyPricing,
  addLevel,
  removeLevel,
  setPrice,
  removePrice,
} from "./controller.js";
import { requireActiveSubscription } from "../../middleware/softwareAuthMiddleware.js";

const router = Router({ mergeParams: true });

router.get("/", getCompanyPricing);
router.put("/", requireActiveSubscription, updateCompanyPricing);
router.post("/levels", requireActiveSubscription, addLevel);
router.delete("/levels", requireActiveSubscription, removeLevel);
router.post("/prices", requireActiveSubscription, setPrice);
router.delete("/prices", requireActiveSubscription, removePrice);

export default router;

