import multer from "multer";
import XLSX from "xlsx-js-style";
import {
  create as createGstrImport,
  findByCompany as findImportsByCompany,
  findById as findImportById,
  deleteById as deleteImportById,
} from "../models/gstr2bimportmodel.js";
import {
  findById as findProcessedById,
  updateLedgerNames as updateProcessedLedgerNamesById,
  updateReverseChargeLedgerNames as updateReverseChargeLedgerNamesById,
  updateMismatchedLedgerNames as updateMismatchedLedgerNamesById,
  updateDisallowLedgerNames as updateDisallowLedgerNamesById,
  deleteById as deleteProcessedById,
  tallyWithGstr2A as tallyWithGstr2AById,
  storePurchaseRegisterComparison,
} from "../models/processedfilemodel.js";
import { findById as findGstr2AProcessedById } from "../models/processedfilemodel2a.js";
import { processAndStoreDocument } from "../utils/gstr2bProcessor.js";
import { findById as findGstr2BImportById } from "../models/gstr2bimportmodel.js";

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
      ? value.replace(/,/g, "").replace(/%/g, "").trim()
      : Number(value);
  const parsed =
    typeof normalized === "number" ? normalized : Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTaxRatePercent = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  const isPercentFormattedNumber =
    typeof value === "number" && Math.abs(value) <= 1;

  if (isPercentFormattedNumber) {
    return Number((parsed * 100).toFixed(2));
  }

  return parsed;
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
        } else if (key === "gstrFilingDate") {
          entry[key] = formatDisplayDate(cell);
        } else if (key === "taxRatePercent") {
          entry[key] = parseTaxRatePercent(cell);
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

const ADDITIONAL_HEADER_ROW_INDEX = 5;

const formatGenericCell = (cell) => {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return cell;
  }
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return formatDisplayDate(cell);
  }
  const stringValue = String(cell).trim();
  return stringValue.length ? stringValue : null;
};

// Detect if a row has meaningful header content
const hasHeaderContent = (row) => {
  if (!row || !Array.isArray(row)) return false;
  const nonEmptyCount = row.filter(
    (cell) => cell !== null && cell !== undefined && String(cell).trim().length > 0
  ).length;
  return nonEmptyCount >= 3; // At least 3 non-empty cells to be considered a header row
};

// Find header and sub-header rows (checking rows 5-6 or 6-7, 0-indexed: 4-5 or 5-6)
const findHeaderRows = (rows = []) => {
  // Try rows 5-6 first (0-indexed: 4-5)
  if (rows.length > 5) {
    const row5 = rows[4] || [];
    const row6 = rows[5] || [];
    if (hasHeaderContent(row5) && hasHeaderContent(row6)) {
      return { mainHeaderRow: 4, subHeaderRow: 5 };
    }
    if (hasHeaderContent(row5)) {
      // Only main header row found
      return { mainHeaderRow: 4, subHeaderRow: null };
    }
  }
  
  // Try rows 6-7 (0-indexed: 5-6)
  if (rows.length > 6) {
    const row6 = rows[5] || [];
    const row7 = rows[6] || [];
    if (hasHeaderContent(row6) && hasHeaderContent(row7)) {
      return { mainHeaderRow: 5, subHeaderRow: 6 };
    }
    if (hasHeaderContent(row6)) {
      return { mainHeaderRow: 5, subHeaderRow: null };
    }
  }
  
  // Fallback: find first non-empty row
  for (let idx = 0; idx < Math.min(10, rows.length); idx += 1) {
    if (hasHeaderContent(rows[idx])) {
      // Check if next row also has content (could be sub-header)
      if (idx + 1 < rows.length && hasHeaderContent(rows[idx + 1])) {
        return { mainHeaderRow: idx, subHeaderRow: idx + 1 };
      }
      return { mainHeaderRow: idx, subHeaderRow: null };
    }
  }
  
  return null;
};

// Combine main header and sub-header, handling merged cells
// When main header is empty in a cell, it means it's merged from previous cell
const combineHeaders = (mainHeaderRow, subHeaderRow, maxCols) => {
  const headers = [];
  let currentMainHeader = null;
  
  for (let colIdx = 0; colIdx < maxCols; colIdx += 1) {
    const mainCell = mainHeaderRow?.[colIdx];
    const subCell = subHeaderRow?.[colIdx];
    
    const mainValue = formatGenericCell(mainCell);
    const subValue = formatGenericCell(subCell);
    
    // If main header exists (not empty), update current main header
    // Empty cells in main header row indicate merged cells - keep using previous main header
    if (mainValue) {
      currentMainHeader = mainValue;
    }
    
    // If sub-header exists, combine with main header
    if (subValue) {
      if (currentMainHeader && currentMainHeader !== subValue) {
        // Only combine if they're different (avoid "Tax Amount(Tax Amount)")
        headers.push(`${subValue}(${currentMainHeader})`);
      } else {
        // If same or no main header, just use sub-header
        headers.push(subValue);
      }
    } else if (currentMainHeader) {
      // Only main header, no sub-header
      headers.push(currentMainHeader);
    } else {
      // No header at all
      headers.push(`Column ${colIdx + 1}`);
    }
  }
  
  return headers;
};

const parseAdditionalSheet = (sheet) => {
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });
  
  if (!rows.length) {
    return null;
  }
  
  const headerInfo = findHeaderRows(rows);
  if (!headerInfo) {
    return null;
  }
  
  const { mainHeaderRow: mainIdx, subHeaderRow: subIdx } = headerInfo;
  const mainHeaderRow = rows[mainIdx] || [];
  const subHeaderRow = subIdx !== null ? (rows[subIdx] || []) : null;
  
  // Determine max columns by finding the longest row
  const maxCols = Math.max(
    mainHeaderRow.length,
    subHeaderRow ? subHeaderRow.length : 0,
    ...rows.slice(Math.max(mainIdx, subIdx !== null ? subIdx : mainIdx) + 1).map(r => r?.length || 0)
  );
  
  // Combine headers
  const headers = subHeaderRow
    ? combineHeaders(mainHeaderRow, subHeaderRow, maxCols)
    : mainHeaderRow.map((cell, idx) => {
        const value = formatGenericCell(cell);
        return value ?? `Column ${idx + 1}`;
      });
  
  // Determine data start row (after sub-header if exists, otherwise after main header)
  const dataStartRow = subIdx !== null ? subIdx + 1 : mainIdx + 1;
  
  const dataRows = rows
    .slice(dataStartRow)
    .map((row) => {
      const record = {};
      headers.forEach((header, idx) => {
        if (!header) return;
        const value = formatGenericCell(row[idx]);
        record[header] =
          value === null || value === undefined ? "" : value;
      });
      return record;
    })
    .filter((record) =>
      Object.values(record).some(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).trim().length > 0
      )
    );

  return { headers, rows: dataRows };
};

const parseAdditionalSheets = (workbook) => {
  const sheetNames = workbook.SheetNames || [];
  const b2bIndex = sheetNames.findIndex(
    (name = "") => name.toLowerCase() === "b2b"
  );
  if (b2bIndex === -1) return [];
  const targetNames = sheetNames.slice(b2bIndex + 1);
  const parsed = [];
  targetNames.forEach((name) => {
    const sheet = workbook.Sheets[name];
    if (!sheet) return;
    const result = parseAdditionalSheet(sheet);
    if (result) {
      parsed.push({
        sheetName: name,
        headers: result.headers,
        rows: result.rows,
      });
    }
  });
  return parsed;
};

const sanitizeLedgerUpdateRows = (rows = []) =>
  rows
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
      acceptCredit:
        Object.prototype.hasOwnProperty.call(row ?? {}, "acceptCredit") ||
        Object.prototype.hasOwnProperty.call(row ?? {}, "accept_credit")
          ? row.acceptCredit ?? row.accept_credit ?? null
          : undefined,
      action:
        Object.prototype.hasOwnProperty.call(row ?? {}, "action") ||
        Object.prototype.hasOwnProperty.call(row ?? {}, "Action")
          ? row.action ?? row.Action ?? null
          : undefined,
      actionReason:
        Object.prototype.hasOwnProperty.call(row ?? {}, "actionReason") ||
        Object.prototype.hasOwnProperty.call(row ?? {}, "action_reason") ||
        Object.prototype.hasOwnProperty.call(row ?? {}, "Action Reason")
          ? (() => {
              const raw =
                row.actionReason ??
                row.action_reason ??
                row["Action Reason"] ??
                null;
              if (raw === undefined || raw === null) return null;
              const trimmed = sanitizeString(raw);
              return trimmed ? trimmed : null;
            })()
          : undefined,
      narration:
        Object.prototype.hasOwnProperty.call(row ?? {}, "narration") ||
        Object.prototype.hasOwnProperty.call(row ?? {}, "Narration")
          ? (() => {
              const raw =
                row.narration ??
                row.Narration ??
                null;
              if (raw === undefined || raw === null) return null;
              const trimmed = sanitizeString(raw);
              return trimmed ? trimmed : null;
            })()
          : undefined,
    }))
    .filter(
      (row) =>
        (row.slNo !== undefined && !Number.isNaN(row.slNo)) ||
        (row.index !== undefined && !Number.isNaN(row.index))
    );

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
    const restSheets = parseAdditionalSheets(workbook);

    const document = await createGstrImport({
      company: companyId,
      companySnapshot: snapshot,
      sheetName: "B2B",
      rows,
      restSheets,
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

    const sanitized = sanitizeLedgerUpdateRows(rows);

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

    const sanitized = sanitizeLedgerUpdateRows(rows);

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

export const updateMismatchedLedgerNames = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ message: "rows payload is required." });
    }

    const sanitized = sanitizeLedgerUpdateRows(rows);
    if (!sanitized.length) {
      return res
        .status(400)
        .json({ message: "rows payload is invalid or empty." });
    }

    const updated = await updateMismatchedLedgerNamesById(id, sanitized);
    if (!updated) {
      return res.status(404).json({
        message:
          "Processed file not found or no mismatched rows available.",
      });
    }

    return res.status(200).json({
      message: "Mismatched ledger names updated.",
      processed: updated,
    });
  } catch (error) {
    console.error("updateMismatchedLedgerNames Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update mismatched ledger names.",
    });
  }
};

export const updateDisallowLedgerNames = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ message: "rows payload is required." });
    }

    const sanitized = sanitizeLedgerUpdateRows(rows);
    if (!sanitized.length) {
      return res
        .status(400)
        .json({ message: "rows payload is invalid or empty." });
    }

    const updated = await updateDisallowLedgerNamesById(id, sanitized);
    if (!updated) {
      return res.status(404).json({
        message:
          "Processed file not found or no disallow rows available.",
      });
    }

    return res.status(200).json({
      message: "Disallow ledger names updated.",
      processed: updated,
    });
  } catch (error) {
    console.error("updateDisallowLedgerNames Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to update disallow ledger names.",
    });
  }
};

export const deleteImport = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete both the import and the processed file
    const deletedImport = await deleteImportById(id);
    if (!deletedImport) {
      return res.status(404).json({
        message: "Import not found.",
      });
    }

    // Also delete the processed file if it exists (they share the same _id)
    await deleteProcessedById(id);

    return res.status(200).json({
      message: "Import and processed file deleted successfully.",
      deleted: deletedImport,
    });
  } catch (error) {
    console.error("deleteImport Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to delete import.",
    });
  }
};

export const tallyWithGstr2A = async (req, res) => {
  try {
    const { id } = req.params;
    const { gstr2aId } = req.body || {};
    if (!gstr2aId) {
      return res.status(400).json({ message: "gstr2aId is required" });
    }

    const processed2B = await findProcessedById(id);
    if (!processed2B) {
      return res.status(404).json({ message: "Processed GSTR-2B file not found" });
    }

    const processed2A = await findGstr2AProcessedById(gstr2aId);
    if (!processed2A) {
      return res.status(404).json({ message: "Processed GSTR-2A file not found" });
    }

    const updated = await tallyWithGstr2AById(id, processed2A.processedRows || []);
    if (!updated) {
      return res.status(500).json({ message: "Failed to update processed GSTR-2B file" });
    }

    return res.status(200).json({
      message: "GSTR-2B sheet updated after tallying with GSTR-2A.",
      processed: updated,
    });
  } catch (error) {
    console.error("tallyWithGstr2A Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to tally GSTR-2B with GSTR-2A",
    });
  }
};

/**
 * Normalizes an invoice number by extracting the first meaningful numeric segment.
 * This handles cases where invoice numbers have prefixes/suffixes but the actual
 * invoice number is a numeric segment.
 * 
 * Logic:
 * 1. Split by '/'
 * 2. From left to right, pick the first segment that is purely numeric
 * 3. Remove leading zeros safely
 * 4. If no purely numeric segment found, pick the largest numeric group from the string
 * 
 * Examples:
 * - "330/25-26" -> "330"
 * - "VIPL/25-26/04074" -> "4074" (first purely numeric segment after splitting, leading zero removed)
 * - "DEKJ/2526/07008" -> "7008" (first purely numeric segment after splitting, leading zero removed)
 * - "CM/398" -> "398"
 * - "25-26/1714" -> "1714"
 * - "GST25-26/07445" -> "7445"
 * 
 * @param {string|number|null|undefined} value - The invoice number to normalize
 * @returns {string} - The normalized invoice number (first numeric segment, or largest numeric group if none found)
 */
export const normalizeInvoiceNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  
  // Convert to string, trim, and uppercase
  const cleaned = String(value).trim().toUpperCase();
  
  if (!cleaned) {
    return "";
  }
  
  // Split by '/'
  const segments = cleaned.split('/');
  
  // Collect all purely numeric segments
  const purelyNumericSegments = [];
  for (const segment of segments) {
    const trimmedSegment = segment.trim();
    // Check if segment is purely numeric: /^\d+$/
    if (/^\d+$/.test(trimmedSegment)) {
      purelyNumericSegments.push(trimmedSegment);
    }
  }
  
  // If we found purely numeric segments, pick the most meaningful one
  if (purelyNumericSegments.length > 0) {
    // Strategy: prefer longer segments (more likely to be invoice numbers than years)
    // If same length, prefer the last one (invoice numbers often come after year prefixes)
    const mostMeaningful = purelyNumericSegments.reduce((a, b) => {
      if (b.length > a.length) return b;
      if (b.length < a.length) return a;
      // Same length: prefer the last one (rightmost)
      return b;
    });
    // Remove leading zeros safely (but keep at least one digit if all zeros)
    const normalized = mostMeaningful.replace(/^0+/, '') || '0';
    return normalized;
  }
  
  // If no purely numeric segment found, find the largest numeric group from the string
  const allNumericGroups = cleaned.match(/\d+/g);
  if (allNumericGroups && allNumericGroups.length > 0) {
    // Find the largest numeric group (by numeric value)
    const largest = allNumericGroups.reduce((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      return numB > numA ? b : a;
    });
    // Remove leading zeros safely
    const normalized = largest.replace(/^0+/, '') || '0';
    return normalized;
  }
  
  // Fallback to the cleaned full string if no numeric part is found
  return cleaned;
};

export const parsePurchaseRegisterExcel = (workbook) => {
  // Use first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("No sheets found in Purchase Register Excel file");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (rows.length < 2) {
    throw new Error("Purchase Register Excel must have at least 2 rows");
  }

  // Required column names to identify header row
  const headerSearchColumns = [
    "Supplier Invoice No.",
    "GSTIN/UIN",
    "Gross Total",
  ];

  // Search for header row between rows 1-10 (0-indexed: 0-9)
  let headerRowIndex = -1;
  let headerRow = null;

  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const candidateRow = rows[i] || [];
    const rowValues = candidateRow.map((cell) =>
      String(cell || "").trim().toLowerCase()
    );

    // Check if this row contains all required column names
    const hasAllRequired = headerSearchColumns.every((colName) => {
      const normalized = colName.trim().toLowerCase();
      return rowValues.includes(normalized);
    });

    if (hasAllRequired) {
      headerRowIndex = i;
      headerRow = candidateRow;
      break;
    }
  }

  if (headerRowIndex === -1 || !headerRow) {
    throw new Error(
      `Could not find header row with required columns (${headerSearchColumns.join(", ")}) in first 20 rows`
    );
  }

  // Data starts from the row after header row
  const dataStartIndex = headerRowIndex + 1;
  const dataRows = rows.slice(dataStartIndex);

  // Find column indices for required columns
  const findColumnIndex = (headerName) => {
    const normalized = String(headerName || "").trim().toLowerCase();
    return headerRow.findIndex((cell) => {
      const cellValue = String(cell || "").trim().toLowerCase();
      return cellValue === normalized;
    });
  };

  const dateIdx = findColumnIndex("Date");
  const particularsIdx = findColumnIndex("Particulars");
  const voucherNoIdx = findColumnIndex("Voucher No.");
  const supplierInvoiceNoIdx = findColumnIndex("Supplier Invoice No.");
  const supplierInvoiceDateIdx = findColumnIndex("Supplier Invoice Date");
  const gstinUinIdx = findColumnIndex("GSTIN/UIN");
  const grossTotalIdx = findColumnIndex("Gross Total");
  const allItemsIdx = findColumnIndex("All Items");

  // Validate required columns
  const requiredColumns = {
    "Supplier Invoice No.": supplierInvoiceNoIdx,
    "GSTIN/UIN": gstinUinIdx,
    "Gross Total": grossTotalIdx,
  };

  const missingColumns = Object.entries(requiredColumns)
    .filter(([_, idx]) => idx === -1)
    .map(([name]) => name);

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns in Purchase Register: ${missingColumns.join(", ")}`
    );
  }

  // Parse data rows
  const parsedRows = dataRows
    .filter((row) => {
      // Filter out empty rows
      return row && row.some((cell) => cell !== null && cell !== undefined && String(cell).trim().length > 0);
    })
    .map((row, idx) => {
      const parseNumber = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const normalized = typeof value === "string" ? value.replace(/,/g, "").trim() : value;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
      };

      const parseString = (value) => {
        if (value === null || value === undefined) return null;
        return String(value).trim() || null;
      };

      return {
        _rowIndex: idx + headerRowIndex + 2, // Actual row number in Excel (1-indexed: headerRowIndex + 1 + dataRowIndex + 1)
        date: parseString(row[dateIdx]),
        particulars: parseString(row[particularsIdx]),
        voucherNo: parseString(row[voucherNoIdx]),
        supplierInvoiceNo: parseString(row[supplierInvoiceNoIdx]),
        supplierInvoiceDate: parseString(row[supplierInvoiceDateIdx]),
        gstinUin: parseString(row[gstinUinIdx]),
        grossTotal: parseNumber(row[grossTotalIdx]),
        allItems: parseString(row[allItemsIdx]),
      };
    })
    .filter((row) => {
      // Ignore rows where Supplier Invoice No. or GSTIN/UIN is empty
      return row.supplierInvoiceNo && row.gstinUin;
    });

  return parsedRows;
};

export const compareWithGstr2B = (purchaseRegisterRows, gstr2bProcessedRows) => {
  // Build composite key map from GSTR-2B: "NORMALIZED_VCHNO|GSTIN" -> row
  const gstr2bMap = new Map();
  (gstr2bProcessedRows || []).forEach((row) => {
    // Normalize invoice number (extract numeric suffix)
    const normalizedVchNo = normalizeInvoiceNumber(row?.vchNo || "");
    const gstin = String(row?.gstinUin || "").trim().toUpperCase();
    const supplierAmount = typeof row?.supplierAmount === "number" ? row.supplierAmount : null;

    if (normalizedVchNo && gstin) {
      const compositeKey = `${normalizedVchNo}|${gstin}`;
      if (!gstr2bMap.has(compositeKey)) {
        gstr2bMap.set(compositeKey, []);
      }
      gstr2bMap.get(compositeKey).push({ row, supplierAmount });
    }
  });

  // Build composite key set from Purchase Register
  const prMap = new Map();
  purchaseRegisterRows.forEach((prRow) => {
    // Normalize invoice number (extract numeric suffix)
    const normalizedInvoiceNo = normalizeInvoiceNumber(prRow.supplierInvoiceNo || "");
    const gstin = String(prRow.gstinUin || "").trim().toUpperCase();
    const grossTotal = prRow.grossTotal;

    if (normalizedInvoiceNo && gstin) {
      const compositeKey = `${normalizedInvoiceNo}|${gstin}`;
      if (!prMap.has(compositeKey)) {
        prMap.set(compositeKey, []);
      }
      prMap.get(compositeKey).push({ prRow, grossTotal });
    }
  });

  // Classify rows
  const matched = [];
  const missingInPR = [];
  const missingInGstr2B = [];

  // Track which PR rows have been matched
  const matchedPRKeys = new Set();

  // Check GSTR-2B rows
  gstr2bMap.forEach((gstr2bRows, key) => {
    const prRows = prMap.get(key) || [];
    if (prRows.length === 0) {
      // Missing in Purchase Register
      gstr2bRows.forEach(({ row }) => {
        missingInPR.push({
          status: "missing_in_pr",
          gstr2bRow: row,
          purchaseRegisterRow: null,
        });
      });
    } else {
      // Check for amount match
      for (const { row, supplierAmount } of gstr2bRows) {
        let foundMatch = false;
        for (const { prRow, grossTotal } of prRows) {
          // Match condition: supplierAmount == grossTotal OR supplierAmount == grossTotal ± 1
          const amountMatch =
            supplierAmount !== null &&
            grossTotal !== null &&
            (supplierAmount === grossTotal ||
              Math.abs(supplierAmount - grossTotal) <= 1);

          if (amountMatch) {
            matched.push({
              status: "matched",
              gstr2bRow: row,
              purchaseRegisterRow: prRow,
            });
            matchedPRKeys.add(key);
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          // Amount doesn't match, still consider as missing in PR
          missingInPR.push({
            status: "missing_in_pr",
            gstr2bRow: row,
            purchaseRegisterRow: null,
          });
        }
      }
    }
  });

  // Check Purchase Register rows that weren't matched
  prMap.forEach((prRows, key) => {
    if (!matchedPRKeys.has(key)) {
      // This PR key wasn't matched, check if it exists in GSTR-2B
      const gstr2bRows = gstr2bMap.get(key) || [];
      if (gstr2bRows.length === 0) {
        // Missing in GSTR-2B
        prRows.forEach(({ prRow }) => {
          missingInGstr2B.push({
            status: "missing_in_gstr2b",
            gstr2bRow: null,
            purchaseRegisterRow: prRow,
          });
        });
      }
    }
  });

  return {
    matched,
    missingInPR,
    missingInGstr2B,
  };
};

export const tallyWithPurchaseReg = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "Purchase Register Excel file is required" });
    }

    const processed2B = await findProcessedById(id);
    if (!processed2B) {
      return res.status(404).json({ message: "Processed GSTR-2B file not found" });
    }

    // Parse Purchase Register Excel
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const purchaseRegisterRows = parsePurchaseRegisterExcel(workbook);

    if (!purchaseRegisterRows.length) {
      return res.status(400).json({
        message: "No valid rows found in Purchase Register Excel file",
      });
    }

    // Compare with GSTR-2B processed rows
    const comparison = compareWithGstr2B(
      purchaseRegisterRows,
      processed2B.processedRows || []
    );

    // Build set of matched keys for deletion: "NORMALIZED_INVOICE_NO|GSTIN|SUPPLIER_AMOUNT"
    // Include amount to ensure we only delete rows that match invoice+GSTIN+amount
    const matchedKeysSet = new Set();
    (comparison.matched || []).forEach((match) => {
      const gstr2bRow = match.gstr2bRow;
      if (gstr2bRow) {
        const normalizedVchNo = normalizeInvoiceNumber(gstr2bRow.vchNo || "");
        const gstin = String(gstr2bRow.gstinUin || "").trim().toUpperCase();
        const supplierAmount = typeof gstr2bRow.supplierAmount === "number" 
          ? gstr2bRow.supplierAmount 
          : (gstr2bRow.supplierAmount !== null && gstr2bRow.supplierAmount !== undefined 
            ? String(gstr2bRow.supplierAmount) 
            : "");
        if (normalizedVchNo && gstin) {
          // Include amount in the key to make it more specific
          const compositeKey = `${normalizedVchNo}|${gstin}|${supplierAmount}`;
          matchedKeysSet.add(compositeKey);
        }
      }
    });

    // Store comparison result and delete matched rows
    const comparisonData = {
      purchaseRegisterRows,
      comparison,
      comparedAt: new Date().toISOString(),
    };

    const updated = await storePurchaseRegisterComparison(id, comparisonData, matchedKeysSet);
    if (!updated) {
      return res.status(500).json({
        message: "Failed to store Purchase Register comparison",
      });
    }

    return res.status(200).json({
      message: "Purchase Register tally completed successfully.",
      processed: updated,
      comparison: {
        matched: comparison.matched.length,
        missingInPR: comparison.missingInPR.length,
        missingInGstr2B: comparison.missingInGstr2B.length,
      },
    });
  } catch (error) {
    console.error("tallyWithPurchaseReg Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to tally with Purchase Register",
    });
  }
};

/**
 * Filter GSTR-2B rows that don't exist in GSTR-2A (download-only, no persistence)
 * Uses invoice normalization for accurate matching
 */
const filterGstr2BByGstr2A = (gstr2bRows, gstr2aRows) => {
  // Build composite key set from GSTR-2A using normalized invoice numbers
  const compositeKeySet = new Set();
  (gstr2aRows || []).forEach((row) => {
    const normalizedVchNo = normalizeInvoiceNumber(row?.vchNo || "");
    const gstin = String(row?.gstinUin || "").trim().toUpperCase();
    
    if (normalizedVchNo && gstin) {
      const compositeKey = `${normalizedVchNo}|${gstin}`;
      compositeKeySet.add(compositeKey);
    }
  });

  if (!compositeKeySet.size) {
    return {
      processedRows: gstr2bRows.processedRows || [],
      reverseChargeRows: gstr2bRows.reverseChargeRows || [],
      mismatchedRows: gstr2bRows.mismatchedRows || [],
      disallowRows: gstr2bRows.disallowRows || [],
    };
  }

  // Filter function: keep row only if its composite key is NOT in the set
  const shouldKeep = (row) => {
    const normalizedVchNo = normalizeInvoiceNumber(row?.vchNo || "");
    const gstin = String(row?.gstinUin || "").trim().toUpperCase();
    
    if (!normalizedVchNo || !gstin) {
      return true; // Keep rows with missing data
    }
    
    const compositeKey = `${normalizedVchNo}|${gstin}`;
    return !compositeKeySet.has(compositeKey);
  };

  return {
    processedRows: (gstr2bRows.processedRows || []).filter(shouldKeep),
    reverseChargeRows: (gstr2bRows.reverseChargeRows || []).filter(shouldKeep),
    mismatchedRows: (gstr2bRows.mismatchedRows || []).filter(shouldKeep),
    disallowRows: (gstr2bRows.disallowRows || []).filter(shouldKeep),
  };
};

/**
 * Build GSTR-2B sheet from original rows
 */
const buildGstr2BSheet = (rows = []) => {
  if (!rows.length) {
    return XLSX.utils.aoa_to_sheet([["No GSTR-2B data available"]]);
  }
  const worksheetRows = rows.map((row) => {
    const entry = {};
    HEADER_SEQUENCE.forEach(({ key, label }) => {
      entry[label] = row?.[key] ?? "";
    });
    return entry;
  });
  return XLSX.utils.json_to_sheet(worksheetRows);
};

/**
 * Create sheet from rows with headers
 */
const createSheetFromRows = (rows = [], headers = []) => {
  if (!rows.length) {
    return XLSX.utils.aoa_to_sheet([["No data available"]]);
  }
  const normalizedHeaders = headers.length > 0 
    ? headers 
    : Object.keys(rows[0] || {});
  const normalizedRows = rows.map((row) => {
    const normalized = {};
    normalizedHeaders.forEach((h) => {
      normalized[h] = row?.[h] ?? "";
    });
    return normalized;
  });
  return XLSX.utils.json_to_sheet(normalizedRows, { header: normalizedHeaders });
};

/**
 * Color map matching buildCombinedWorkbook.js
 */
const COLOR_MAP = {
  green: "FFE4F8E5",
  orange: "FFFFEAD6",
  purple: "FFECE2FF",
  red: "FFFFE0E0",
  grand: "FFE0F2FF",
  accept: "FFD6F5E3",
  reject: "FFF9D6D6",
  pending: "FFFFF5D6",
  none: "FFF2F4F7",
  actionGrand: "FFE3F0FF",
};

/**
 * Apply row style (color) to a sheet row
 */
const applyRowStyle = (sheet, headers, rowIndex, color) => {
  if (!color) return;
  headers.forEach((_, colIdx) => {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIdx });
    let cell = sheet[cellRef];
    if (!cell) {
      cell = { t: "s", v: "" };
      sheet[cellRef] = cell;
    }
    cell.s = {
      ...cell.s,
      fill: {
        patternType: "solid",
        fgColor: { rgb: color },
      },
    };
  });
};

/**
 * Build combined workbook matching buildCombinedWorkbook.js format
 */
const buildCombinedWorkbookBackend = ({
  originalRows = [],
  processedRows = [],
  reverseChargeRows = [],
  mismatchedRows = [],
  disallowRows = [],
  restSheets = [],
  purchaseRegisterComparison = null,
}) => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: GSTR-2B (original)
  const gstrSheet = buildGstr2BSheet(originalRows);
  XLSX.utils.book_append_sheet(workbook, gstrSheet, "GSTR2B");

  // Sheet 2: Master (simplified - categories without complex totals)
  // Build category rows similar to buildCombinedWorkbook
  const masterRows = [];
  const allRows = [
    ...(processedRows || []),
    ...(reverseChargeRows || []),
    ...(mismatchedRows || []),
    ...(disallowRows || []),
  ];
  
  if (allRows.length > 0) {
    const masterHeaders = ["Category", ...Object.keys(allRows[0] || {})];
    
    // Helper to check if row is in a collection
    const isInCollection = (row, collection) => {
      return collection.some((r) => {
        const rowSig = `${r?.vchNo || ""}|${r?.gstinUin || ""}|${r?.supplierAmount || ""}`;
        const checkSig = `${row?.vchNo || ""}|${row?.gstinUin || ""}|${row?.supplierAmount || ""}`;
        return rowSig === checkSig;
      });
    };
    
    // Categorize rows
    const greenRows = processedRows.filter((row) => {
      const itcAvailability = row?.["ITC Availability"];
      const isItcNo = itcAvailability === "No";
      if (isItcNo) return false;
      return !isInCollection(row, reverseChargeRows) && 
             !isInCollection(row, mismatchedRows) && 
             !isInCollection(row, disallowRows);
    });
    
    const orangeRows = mismatchedRows.filter((row) => {
      const itcAvailability = row?.["ITC Availability"];
      const isItcNo = itcAvailability === "No";
      return !isItcNo;
    });
    
    const purpleRows = reverseChargeRows.filter((row) => {
      const itcAvailability = row?.["ITC Availability"];
      const isItcNo = itcAvailability === "No";
      return !isItcNo;
    });
    
    const redRows = [
      ...disallowRows,
      ...processedRows.filter((row) => {
        const itcAvailability = row?.["ITC Availability"];
        return itcAvailability === "No";
      }),
      ...reverseChargeRows.filter((row) => {
        const itcAvailability = row?.["ITC Availability"];
        return itcAvailability === "No";
      }),
      ...mismatchedRows.filter((row) => {
        const itcAvailability = row?.["ITC Availability"];
        return itcAvailability === "No";
      }),
    ];
    
    // Add rows with categories and track row styles
    const masterRowStyles = new Map();
    let currentRowIndex = 0;
    
    const addCategoryRows = (rows, categoryLabel, color) => {
      rows.forEach((row) => {
        const mapped = { Category: categoryLabel };
        masterHeaders.forEach((header) => {
          if (header !== "Category" && row && Object.prototype.hasOwnProperty.call(row, header)) {
            mapped[header] = row[header];
          }
        });
        masterRowStyles.set(currentRowIndex, color);
        masterRows.push(mapped);
        currentRowIndex++;
      });
      if (rows.length) {
        masterRows.push({ Category: "" });
        currentRowIndex++;
      }
    };
    
    addCategoryRows(greenRows, "Allowed (Green)", COLOR_MAP.green);
    addCategoryRows(orangeRows, "Mismatched - Accept Credit No", COLOR_MAP.orange);
    addCategoryRows(purpleRows, "RCM", COLOR_MAP.purple);
    addCategoryRows(redRows, "Disallow", COLOR_MAP.red);
    
    if (masterRows.length > 0) {
      const masterSheet = createSheetFromRows(masterRows, masterHeaders);
      // Apply row styles
      masterRowStyles.forEach((color, rowIndex) => {
        applyRowStyle(masterSheet, masterHeaders, rowIndex, color);
      });
      XLSX.utils.book_append_sheet(workbook, masterSheet, "Master");
    }
  }

  // Sheet 3: Processed
  if (processedRows.length > 0) {
    const processedHeaders = Object.keys(processedRows[0] || {});
    const processedSheet = createSheetFromRows(processedRows, processedHeaders);
    XLSX.utils.book_append_sheet(workbook, processedSheet, "Processed");
  }

  // Sheet 4: RCM
  if (reverseChargeRows.length > 0) {
    const rcmHeaders = Object.keys(reverseChargeRows[0] || {});
    const rcmSheet = createSheetFromRows(reverseChargeRows, rcmHeaders);
    XLSX.utils.book_append_sheet(workbook, rcmSheet, "RCM");
  }

  // Sheet 5: Mismatched
  if (mismatchedRows.length > 0) {
    const mismatchedHeaders = Object.keys(mismatchedRows[0] || {});
    const mismatchedSheet = createSheetFromRows(mismatchedRows, mismatchedHeaders);
    XLSX.utils.book_append_sheet(workbook, mismatchedSheet, "Mismatched");
  }

  // Sheet 6: Disallow
  if (disallowRows.length > 0) {
    const disallowHeaders = Object.keys(disallowRows[0] || {});
    const disallowSheet = createSheetFromRows(disallowRows, disallowHeaders);
    XLSX.utils.book_append_sheet(workbook, disallowSheet, "Disallow");
  }

  // Sheet 7: Rest Sheets (if any)
  if (restSheets?.length) {
    const restData = [];
    restSheets.forEach(({ sheetName, headers = [], rows: sheetRows = [] }) => {
      const normalizedHeaders = headers.length > 0
        ? headers
        : sheetRows.length > 0
        ? Object.keys(sheetRows[0])
        : [];
      restData.push([sheetName || "Sheet"]);
      if (normalizedHeaders.length) {
        restData.push(normalizedHeaders);
      } else {
        restData.push(["No headers detected"]);
      }
      if (sheetRows.length) {
        sheetRows.forEach((row) => {
          if (normalizedHeaders.length) {
            restData.push(
              normalizedHeaders.map((header) => {
                const value = row?.[header];
                return value === null || value === undefined ? "" : value;
              })
            );
          } else {
            const values = Object.values(row || {});
            restData.push(values.length ? values : [""]);
          }
        });
      } else {
        restData.push(["No data available"]);
      }
      restData.push([]);
      restData.push([]);
    });
    if (restData.length) {
      while (
        restData.length &&
        restData[restData.length - 1].length === 0
      ) {
        restData.pop();
      }
      const restSheet = XLSX.utils.aoa_to_sheet(restData);
      XLSX.utils.book_append_sheet(workbook, restSheet, "Rest Sheets");
    }
  }

  // Sheet 8: Purchase Register Comparison (if exists)
  if (purchaseRegisterComparison) {
    const { comparison } = purchaseRegisterComparison;
    if (comparison) {
      const { matched = [], missingInPR = [], missingInGstr2B = [] } = comparison;
      
      const headers = [
        "Status",
        "GSTR-2B Vch No",
        "GSTR-2B GSTIN/UIN",
        "GSTR-2B Supplier Amount",
        "GSTR-2B Supplier Name",
        "PR Supplier Invoice No",
        "PR GSTIN/UIN",
        "PR Gross Total",
        "PR Date",
        "PR Particulars",
      ];
      
      const comparisonRows = [];
      const comparisonRowStyles = [];
      
      // Matched rows (green)
      matched.forEach(({ gstr2bRow, purchaseRegisterRow }) => {
        comparisonRows.push({
          Status: "Matched",
          "GSTR-2B Vch No": gstr2bRow?.vchNo || "",
          "GSTR-2B GSTIN/UIN": gstr2bRow?.gstinUin || "",
          "GSTR-2B Supplier Amount": gstr2bRow?.supplierAmount || "",
          "GSTR-2B Supplier Name": gstr2bRow?.supplierName || "",
          "PR Supplier Invoice No": purchaseRegisterRow?.supplierInvoiceNo || "",
          "PR GSTIN/UIN": purchaseRegisterRow?.gstinUin || "",
          "PR Gross Total": purchaseRegisterRow?.grossTotal || "",
          "PR Date": purchaseRegisterRow?.date || "",
          "PR Particulars": purchaseRegisterRow?.particulars || "",
        });
        comparisonRowStyles.push(COLOR_MAP.green);
      });
      
      // Missing in Purchase Register (red)
      missingInPR.forEach(({ gstr2bRow }) => {
        comparisonRows.push({
          Status: "Missing in Purchase Register",
          "GSTR-2B Vch No": gstr2bRow?.vchNo || "",
          "GSTR-2B GSTIN/UIN": gstr2bRow?.gstinUin || "",
          "GSTR-2B Supplier Amount": gstr2bRow?.supplierAmount || "",
          "GSTR-2B Supplier Name": gstr2bRow?.supplierName || "",
          "PR Supplier Invoice No": "",
          "PR GSTIN/UIN": "",
          "PR Gross Total": "",
          "PR Date": "",
          "PR Particulars": "",
        });
        comparisonRowStyles.push(COLOR_MAP.red);
      });
      
      // Missing in GSTR-2B (orange)
      missingInGstr2B.forEach(({ purchaseRegisterRow }) => {
        comparisonRows.push({
          Status: "Missing in GSTR-2B",
          "GSTR-2B Vch No": "",
          "GSTR-2B GSTIN/UIN": "",
          "GSTR-2B Supplier Amount": "",
          "GSTR-2B Supplier Name": "",
          "PR Supplier Invoice No": purchaseRegisterRow?.supplierInvoiceNo || "",
          "PR GSTIN/UIN": purchaseRegisterRow?.gstinUin || "",
          "PR Gross Total": purchaseRegisterRow?.grossTotal || "",
          "PR Date": purchaseRegisterRow?.date || "",
          "PR Particulars": purchaseRegisterRow?.particulars || "",
        });
        comparisonRowStyles.push(COLOR_MAP.orange);
      });

      if (comparisonRows.length > 0) {
        const comparisonSheet = XLSX.utils.json_to_sheet(comparisonRows, { header: headers });
        // Apply color coding to rows
        comparisonRowStyles.forEach((color, rowIndex) => {
          applyRowStyle(comparisonSheet, headers, rowIndex, color);
        });
        XLSX.utils.book_append_sheet(workbook, comparisonSheet, "purchaseregcompared");
      }
    }
  }

  return workbook;
};

/**
 * Download-only: Compare GSTR-2B with GSTR-2A and return Excel (no persistence)
 */
export const compareGstr2BWithGstr2ADownload = async (req, res) => {
  try {
    const { id } = req.params;
    const { gstr2aId } = req.body || {};
    
    if (!gstr2aId) {
      return res.status(400).json({ message: "gstr2aId is required" });
    }

    // Load GSTR-2B processed file
    const processed2B = await findProcessedById(id);
    if (!processed2B) {
      return res.status(404).json({ message: "Processed GSTR-2B file not found" });
    }

    // Load GSTR-2B import (for original rows and restSheets)
    const gstr2bImport = await findGstr2BImportById(id);
    if (!gstr2bImport) {
      return res.status(404).json({ message: "GSTR-2B import not found" });
    }

    // Load GSTR-2A processed file
    const processed2A = await findGstr2AProcessedById(gstr2aId);
    if (!processed2A) {
      return res.status(404).json({ message: "Processed GSTR-2A file not found" });
    }

    // Filter GSTR-2B rows (download-only, no persistence)
    const filtered = filterGstr2BByGstr2A(processed2B, processed2A.processedRows || []);

    // Build Excel workbook matching buildCombinedWorkbook format
    const workbook = buildCombinedWorkbookBackend({
      originalRows: gstr2bImport.rows || [],
      processedRows: filtered.processedRows,
      reverseChargeRows: filtered.reverseChargeRows,
      mismatchedRows: filtered.mismatchedRows,
      disallowRows: filtered.disallowRows,
      restSheets: gstr2bImport.restSheets || [],
    });

    // Convert to buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="GSTR-2B-Cleaned-${Date.now()}.xlsx"`);

    return res.send(buffer);
  } catch (error) {
    console.error("compareGstr2BWithGstr2ADownload Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to compare GSTR-2B with GSTR-2A",
    });
  }
};

/**
 * Download-only: Compare GSTR-2B with Purchase Register and return Excel (no persistence)
 */
export const compareGstr2BWithPurchaseRegDownload = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: "Purchase Register Excel file is required" });
    }

    // Load GSTR-2B processed file
    const processed2B = await findProcessedById(id);
    if (!processed2B) {
      return res.status(404).json({ message: "Processed GSTR-2B file not found" });
    }

    // Load GSTR-2B import (for original rows and restSheets)
    const gstr2bImport = await findGstr2BImportById(id);
    if (!gstr2bImport) {
      return res.status(404).json({ message: "GSTR-2B import not found" });
    }

    // Parse Purchase Register Excel
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const purchaseRegisterRows = parsePurchaseRegisterExcel(workbook);

    if (!purchaseRegisterRows.length) {
      return res.status(400).json({
        message: "No valid rows found in Purchase Register Excel file",
      });
    }

    // Compare with GSTR-2B processed rows
    const comparison = compareWithGstr2B(
      purchaseRegisterRows,
      processed2B.processedRows || []
    );

    // Build comparison data structure
    const purchaseRegisterComparison = {
      purchaseRegisterRows,
      comparison,
      comparedAt: new Date().toISOString(),
    };

    // Build Excel workbook matching buildCombinedWorkbook format
    const comparisonWorkbook = buildCombinedWorkbookBackend({
      originalRows: gstr2bImport.rows || [],
      processedRows: processed2B.processedRows || [],
      reverseChargeRows: processed2B.reverseChargeRows || [],
      mismatchedRows: processed2B.mismatchedRows || [],
      disallowRows: processed2B.disallowRows || [],
      restSheets: gstr2bImport.restSheets || [],
      purchaseRegisterComparison,
    });

    // Convert to buffer
    const buffer = XLSX.write(comparisonWorkbook, { type: "buffer", bookType: "xlsx" });

    // Set response headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="GSTR-2B-vs-Purchase-Reg-${Date.now()}.xlsx"`);

    return res.send(buffer);
  } catch (error) {
    console.error("compareGstr2BWithPurchaseRegDownload Error:", error);
    return res.status(500).json({
      message: error.message || "Failed to compare GSTR-2B with Purchase Register",
    });
  }
};

