import { Router } from "express";
import {
  createSalesPartyMaster,
  deleteSalesPartyMaster,
  getSalesPartyMasterById,
  getSalesPartyMasters,
  updateSalesPartyMaster,
} from "../controllers/salespartymastercontroller.js";
import { requireActiveSubscription } from "../middleware/softwareAuthMiddleware.js";

const router = Router();

// Routes as specified:
// POST /:companyId - create party for company
// GET /:companyId - get all parties for company
// PUT /:id - update party by id
// DELETE /:id - delete party by id
// Additional: GET /single/:id - get single party (for frontend use)
// Note: Order matters - specific routes before parameterized ones

router.get("/single/:id", getSalesPartyMasterById);
router.post("/:companyId", requireActiveSubscription, createSalesPartyMaster);
router.get("/:companyId", getSalesPartyMasters);
router.put("/:id", requireActiveSubscription, updateSalesPartyMaster);
router.delete("/:id", requireActiveSubscription, deleteSalesPartyMaster);

export default router;

