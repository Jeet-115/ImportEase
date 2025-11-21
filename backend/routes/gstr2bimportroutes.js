import { Router } from "express";
import {
  importB2BSheet,
  getProcessedFile,
  getImportsByCompany,
  getImportById,
  processB2BImport,
  updateProcessedLedgerNames,
  uploadMiddleware,
} from "../controllers/gstr2bimportcontroller.js";

const router = Router();

router.post("/b2b", uploadMiddleware, importB2BSheet);
router.get("/company/:companyId", getImportsByCompany);
router.get("/:id", getImportById);
router.post("/:id/process", processB2BImport);
router.get("/:id/processed", getProcessedFile);
router.put("/:id/processed/ledger-names", updateProcessedLedgerNames);

export default router;

