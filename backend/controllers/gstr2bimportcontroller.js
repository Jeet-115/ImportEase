import multer from "multer";
import XLSX from "xlsx";
import {
  create as createGstrImport,
  findByCompany as findImportsByCompany,
  findById as findImportById,
} from "../models/gstr2bimportmodel.js";
import {
  findById as findProcessedById,
  updateLedgerNames as updateProcessedLedgerNamesById,
  updateReverseChargeLedgerNames as updateReverseChargeLedgerNamesById,
} from "../models/processedfilemodel.js";
import { processAndStoreDocument } from "../utils/gstr2bProcessor.js";

const upload = multer({ storage: multer.memoryStorage() });

const HEADER_SEQUENCE = [
  { key: "gstin", label: "GSTIN of supplier", type: "string" },
  { key: "tradeName", label: "Trade/Legal name", type: "string" },
  { key: "invoiceNumber", label: "Invoice number", type: "string" },
  { key: "invoiceType", label: "Invoice type", type: "string" },
  { key: "invoiceDate", label: "Invoice Date", type: "string" },
  { key: "invoiceValue", label: "Invoice Value(₹)", type: "number" },
  { key: "placeOfSupply", label: "Place of supply", type: "string" },
  { key: "reverseCharge", label: "Supply Attract Reverse Charge", type: "string" },
  { key: "taxableValue", label: "Taxable Value (₹)", type: "number" },
  { key: "igst", label: "Integrated Tax(₹)", type: "number" },
  { key: "cgst", label: "Central Tax(₹)", type: "number" },
  { key: "sgst", label: "State/UT Tax(₹)", type: "number" },
  { key: "cess", label: "Cess(₹)", type: "number" },
  { key: "gstrPeriod", label: "GSTR-1/1A/IFF/GSTR-5 Period", type: "string" },
  { key: "gstrFilingDate", label: "GSTR-1/1A/IFF/GSTR-5 Filing Date", type: "date" },
  { key: "itcAvailability", label: "ITC Availability", type: "string" },
  { key: "reason", label: "Reason", type: "string" },
  { key: "taxRatePercent", label: "Applicable % of Tax Rate", type: "number" },
  { key: "source", label: "Source", type: "string" },
  { key: "irn", label: "IRN", type: "string" },
  { key: "irnDate", label: "IRN Date", type: "date" },
];

const sanitizeString = (value) => {
  if (value === null || value === undefined) return null;
  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : null;
};

const formatDisplayDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const dd = String(parsed.d).padStart(2, "0");
      const mm = String(parsed.m).padStart(2, "0");
      return `${dd}/${mm}/${parsed.y}`;
    }
  }
  if (value instanceof Date) {
    const dd = String(value.getDate()).padStart(2, "0");
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${value.getFullYear()}`;
  }
  const stringValue = String(value).trim();
  return stringValue.length ? stringValue : null;
};

export const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const normalized =
    typeof value === "string"
      ? value.replace(/,/g, "").trim()
      : Number(value);
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(
        Date.UTC(
          parsed.y,
          parsed.m - 1,
          parsed.d,
          parsed.H || 0,
          parsed.M || 0,
          parsed.S || 0
        )
      );
      return date.toISOString();
    }
  }
  const isoCandidate = new Date(value);
  return Number.isNaN(isoCandidate.getTime()) ? null : isoCandidate.toISOString();
};

const isRowEmpty = (row) =>
  !row ||
  !row.some(
    (cell) =>
      cell !== null &&
      cell !== undefined &&
      String(cell).trim().length > 0
  );

export const parseB2BSheet = (workbook) => {
  const sheet = workbook.Sheets["B2B"];
  if (!sheet) {
    throw new Error("B2B sheet not found in workbook");
  }

  const sheetRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const DATA_START_ROW = 6; // skip multi-row headers (first 6 rows)
  if (sheetRows.length <= DATA_START_ROW) return [];

  const dataRows = sheetRows.slice(DATA_START_ROW);

  return dataRows
    .filter((row) => !isRowEmpty(row))
    .map((row) => {
      const entry = {};

      HEADER_SEQUENCE.forEach(({ key, type }, index) => {
        const cell = row[index];
        if (key === "invoiceDate") {
          entry[key] = formatDisplayDate(cell);
        } else if (type === "number") {
          entry[key] = parseNumber(cell);
        } else if (type === "date") {
          entry[key] = parseDate(cell);
        } else {
          entry[key] = sanitizeString(cell);
        }
      });

      return entry;
    });
};

export const uploadMiddleware = upload.single("file");

export const importB2BSheet = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const { companyId, companySnapshot } = req.body;

    if (!companyId) {
      return res
        .status(400)
        .json({ message: "companyId is required to import GSTR-2B data" });
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

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const rows = parseB2BSheet(workbook);

    const document = await createGstrImport({
      company: companyId,
      companySnapshot: snapshot,
      sheetName: "B2B",
      rows,
      sourceFileName: req.file.originalname,
      uploadedAt: new Date(),
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error("importB2BSheet Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to import B2B sheet" });
  }
};

export const processB2BImport = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await findImportById(id);
    if (!doc) {
      return res.status(404).json({ message: "GSTR-2B import not found" });
    }

    const processed = await processAndStoreDocument(doc);
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
    console.error("processB2BImport Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to process GSTR-2B data" });
  }
};

export const getProcessedFile = async (req, res) => {
  try {
    const { id } = req.params;
    const processed = await findProcessedById(id);
    if (!processed) {
      return res.status(404).json({ message: "Processed file not found" });
    }
    return res.status(200).json(processed);
  } catch (error) {
    console.error("getProcessedFile Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch processed file" });
  }
};

export const getImportsByCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required" });
    }

    const imports = await findImportsByCompany(companyId);
    return res.status(200).json(imports);
  } catch (error) {
    console.error("getImportsByCompany Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch imports" });
  }
};

export const getImportById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await findImportById(id);
    if (!document) {
      return res.status(404).json({ message: "GSTR-2B import not found" });
    }
    return res.status(200).json(document);
  } catch (error) {
    console.error("getImportById Error:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to fetch GSTR-2B import" });
  }
};

export const updateProcessedLedgerNames = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ message: "rows payload is required." });
    }

    const sanitized = rows
      .map((row) => ({
        slNo:
          row?.slNo !== undefined && row?.slNo !== null
            ? Number(row.slNo)
            : undefined,
        index:
          row?.index !== undefined && row?.index !== null
            ? Number(row.index)
            : undefined,
        ledgerName:
          typeof row?.ledgerName === "string" ? row.ledgerName : row?.ledgerName,
      }))
      .filter(
        (row) =>
          (row.slNo !== undefined && !Number.isNaN(row.slNo)) ||
          (row.index !== undefined && !Number.isNaN(row.index))
      );

    if (!sanitized.length) {
      return res
        .status(400)
        .json({ message: "rows payload is invalid or empty." });
    }

    const updated = await updateProcessedLedgerNamesById(id, sanitized);
    if (!updated) {
      return res.status(404).json({ message: "Processed file not found." });
    }

    return res
      .status(200)
      .json({ message: "Ledger names updated.", processed: updated });
  } catch (error) {
    console.error("updateProcessedLedgerNames Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update ledger names.",
    });
  }
};

export const updateReverseChargeLedgerNames = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ message: "rows payload is required." });
    }

    const sanitized = rows
      .map((row) => ({
        slNo:
          row?.slNo !== undefined && row?.slNo !== null
            ? Number(row.slNo)
            : undefined,
        index:
          row?.index !== undefined && row?.index !== null
            ? Number(row.index)
            : undefined,
        ledgerName:
          typeof row?.ledgerName === "string" ? row.ledgerName : row?.ledgerName,
      }))
      .filter(
        (row) =>
          (row.slNo !== undefined && !Number.isNaN(row.slNo)) ||
          (row.index !== undefined && !Number.isNaN(row.index))
      );

    if (!sanitized.length) {
      return res
        .status(400)
        .json({ message: "rows payload is invalid or empty." });
    }

    const updated = await updateReverseChargeLedgerNamesById(id, sanitized);
    if (!updated) {
      return res.status(404).json({ message: "Processed file not found or no reverse charge rows available." });
    }

    // Ensure the response includes reverseChargeRows
    if (!updated.reverseChargeRows || !Array.isArray(updated.reverseChargeRows)) {
      console.error("Updated document missing reverseChargeRows:", updated);
      return res.status(500).json({ 
        message: "Server error: Updated document is missing reverse charge rows." 
      });
    }

    // Check if reverseChargeRows is empty
    if (updated.reverseChargeRows.length === 0) {
      return res.status(400).json({ 
        message: "No reverse charge rows available to update." 
      });
    }

    return res
      .status(200)
      .json({ message: "Reverse charge ledger names updated.", processed: updated });
  } catch (error) {
    console.error("updateReverseChargeLedgerNames Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update reverse charge ledger names.",
    });
  }
};

