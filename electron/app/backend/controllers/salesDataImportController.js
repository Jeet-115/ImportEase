import multer from "multer";
import XLSX from "xlsx-js-style";
import {
  create as createSalesImport,
  findByCompany as findImportsByCompany,
  findById as findImportById,
  deleteById as deleteImportById,
} from "../models/salesDataImportModel.js";
import {
  findById as findProcessedById,
  deleteById as deleteProcessedById,
} from "../models/processedSalesDataModel.js";
import { parseSalesDataFile } from "../utils/salesDataParser.js";
import { processAndStoreSalesDocument } from "../utils/salesDataProcessor.js";
import { SALES_OUTPUT_COLUMNS } from "../utils/salesDataConstants.js";

const upload = multer({ storage: multer.memoryStorage() });

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

const isAllowedSalesFile = (originalName = "") => {
  const lower = String(originalName).toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export const uploadMiddleware = upload.single("file");

export const importSalesDataFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message:
          "No file received. If this keeps happening, restart the app and upload again.",
      });
    }

    if (!isAllowedSalesFile(req.file.originalname)) {
      return res.status(400).json({
        message: "Accepted formats: .xlsx, .xls, .csv",
      });
    }

    const { companyId, companySnapshot } = req.body;
    if (!companyId) {
      return res
        .status(400)
        .json({ message: "companyId is required to import sales data" });
    }

    let snapshot = companySnapshot;
    if (typeof snapshot === "string") {
      try {
        snapshot = JSON.parse(snapshot);
      } catch {
        snapshot = null;
      }
    }

    if (!snapshot) {
      return res
        .status(400)
        .json({ message: "Valid companySnapshot is required" });
    }

    const parsed = parseSalesDataFile(req.file.buffer, req.file.originalname);
    const document = await createSalesImport({
      company: companyId,
      companySnapshot: snapshot,
      rows: parsed.rows,
      sheetName: parsed.sheetName,
      headerRowIndex: parsed.headerRowIndex,
      sourceType: parsed.sourceType,
      sourceFileName: req.file.originalname,
      uploadedAt: new Date().toISOString(),
      metadata: {
        totalRecords: parsed.rows.length,
      },
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error("importSalesDataFile Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to import sales data file",
    });
  }
};

export const processSalesDataImport = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await findImportById(id);
    if (!doc) {
      return res.status(404).json({ message: "Sales data import not found" });
    }

    const processed = await processAndStoreSalesDocument(doc);
    if (!processed) {
      return res
        .status(400)
        .json({ message: "No rows to process for this document" });
    }

    return res.status(200).json({
      message: "Processed successfully",
      processedCount: processed.processedRows.length,
      processed,
    });
  } catch (error) {
    console.error("processSalesDataImport Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to process sales data",
    });
  }
};

export const getProcessedSalesData = async (req, res) => {
  try {
    const { id } = req.params;
    const processed = await findProcessedById(id);
    if (!processed) {
      return res.status(404).json({ message: "Processed sales data not found" });
    }
    return res.status(200).json(processed);
  } catch (error) {
    console.error("getProcessedSalesData Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch processed sales data",
    });
  }
};

export const getSalesImportsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const imports = await findImportsByCompany(companyId);
    return res.status(200).json(imports);
  } catch (error) {
    console.error("getSalesImportsByCompany Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch sales imports",
    });
  }
};

export const getSalesImportById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await findImportById(id);
    if (!document) {
      return res.status(404).json({ message: "Sales data import not found" });
    }
    return res.status(200).json(document);
  } catch (error) {
    console.error("getSalesImportById Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to fetch sales data import",
    });
  }
};

export const deleteSalesImport = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteImportById(id);
    if (!deleted) {
      return res.status(404).json({ message: "Sales data import not found" });
    }
    await deleteProcessedById(id);
    return res.status(200).json({ message: "Sales data import deleted." });
  } catch (error) {
    console.error("deleteSalesImport Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to delete sales data import",
    });
  }
};

export const downloadProcessedSalesExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const processed = await findProcessedById(id);
    if (!processed?.processedRows?.length) {
      return res
        .status(404)
        .json({ message: "Processed sales data not found for this import." });
    }

    const importDoc = await findImportById(id);
    const companyName =
      importDoc?.companySnapshot?.companyName ||
      processed?.companySnapshot?.companyName ||
      "SalesData";

    const sheet = XLSX.utils.json_to_sheet(processed.processedRows, {
      header: SALES_OUTPUT_COLUMNS,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Sales Processed");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const safeName = String(companyName).replace(/[^\w.-]+/g, "_");
    const filename = `${safeName}-SalesProcessed.xlsx`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    return res.send(buffer);
  } catch (error) {
    console.error("downloadProcessedSalesExcel Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to download processed sales Excel",
    });
  }
};
