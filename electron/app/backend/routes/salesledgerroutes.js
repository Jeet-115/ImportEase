import { Router } from "express";
import {
  createSalesLedgerMaster,
  deleteSalesLedgerMaster,
  getSalesLedgerMasterById,
  getSalesLedgerMasters,
  updateSalesLedgerMaster,
} from "../controllers/salesledgermastercontroller.js";
import { requireActiveSubscription } from "../middleware/softwareAuthMiddleware.js";

const router = Router();

router.get("/", getSalesLedgerMasters);
router.get("/:id", getSalesLedgerMasterById);
router.post("/", requireActiveSubscription, createSalesLedgerMaster);
router.put("/:id", requireActiveSubscription, updateSalesLedgerMaster);
router.delete("/:id", requireActiveSubscription, deleteSalesLedgerMaster);

export default router;

