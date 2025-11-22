import { Router } from "express";
import {
  createPartyMaster,
  deletePartyMaster,
  getPartyMasterById,
  getPartyMasters,
  updatePartyMaster,
  uploadMiddleware,
  uploadPurchaseRegister,
} from "../controllers/partymastercontroller.js";

const router = Router();

router.post("/upload", uploadMiddleware, uploadPurchaseRegister);
router.get("/", getPartyMasters);
router.get("/:id", getPartyMasterById);
router.post("/", createPartyMaster);
router.put("/:id", updatePartyMaster);
router.delete("/:id", deletePartyMaster);

export default router;

