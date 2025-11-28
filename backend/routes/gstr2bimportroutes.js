import { Router } from "express";
import {
  importB2BSheet,
  getProcessedFile,
  getImportsByCompany,
  getImportById,
  processB2BImport,
  updateProcessedLedgerNames,
  updateReverseChargeLedgerNames,
  updateMismatchedLedgerNames,
  updateDisallowLedgerNames,
  uploadMiddleware,
} from "../controllers/gstr2bimportcontroller.js";

const router = Router();

router.post("/b2b", uploadMiddleware, importB2BSheet);
router.get("/company/:companyId", getImportsByCompany);
router.get("/:id", getImportById);
router.post("/:id/process", processB2BImport);
router.get("/:id/processed", getProcessedFile);
router.put("/:id/processed/ledger-names", updateProcessedLedgerNames);
router.put("/:id/processed/reverse-charge/ledger-names", updateReverseChargeLedgerNames);
router.put("/:id/processed/mismatched/ledger-names", updateMismatchedLedgerNames);
router.put("/:id/processed/disallow/ledger-names", updateDisallowLedgerNames);

export default router;

