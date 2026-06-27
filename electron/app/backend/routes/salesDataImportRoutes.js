import { Router } from "express";
import {
  importSalesDataFile,
  getProcessedSalesData,
  getSalesImportsByCompany,
  getSalesImportById,
  processSalesDataImport,
  deleteSalesImport,
  downloadProcessedSalesExcel,
  uploadMiddleware,
} from "../controllers/salesDataImportController.js";
import { requireActiveSubscription } from "../middleware/softwareAuthMiddleware.js";

const router = Router();

router.post(
  "/upload",
  requireActiveSubscription,
  uploadMiddleware,
  importSalesDataFile,
);
router.get("/company/:companyId", getSalesImportsByCompany);
router.post("/:id/process", requireActiveSubscription, processSalesDataImport);
router.get("/:id/processed", getProcessedSalesData);
router.get("/:id/processed/download", downloadProcessedSalesExcel);
router.get("/:id", getSalesImportById);
router.delete("/:id", requireActiveSubscription, deleteSalesImport);

export default router;
