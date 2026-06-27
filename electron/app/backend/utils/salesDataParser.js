import XLSX from "xlsx-js-style";
import {
  SALES_REQUIRED_HEADER_KEYS,
  SALES_SOURCE_HEADERS,
} from "./salesDataConstants.js";
import { formatSalesDisplayDate } from "./salesDataDate.js";

const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");

export const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const pickCell = (row, index) => {
  if (index === undefined || index === null) return null;
  const value = row[index];
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? value : null;
};

const buildColumnIndex = (row) => {
  const columnIndex = {};
  if (!Array.isArray(row)) return columnIndex;

  row.forEach((cell, colIndex) => {
    const key = SALES_SOURCE_HEADERS[normalizeHeader(cell)];
    if (key && columnIndex[key] === undefined) {
      columnIndex[key] = colIndex;
    }
  });

  return columnIndex;
};

const scoreHeaderRow = (columnIndex) => {
  const matched = Object.keys(columnIndex).length;
  const hasRequired = SALES_REQUIRED_HEADER_KEYS.every(
    (key) => columnIndex[key] !== undefined,
  );
  if (!hasRequired) return -1;
  return matched;
};

const findHeaderRow = (matrix) => {
  let best = null;

  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const columnIndex = buildColumnIndex(matrix[rowIndex]);
    const score = scoreHeaderRow(columnIndex);
    if (score < 0) continue;

    if (!best || score > best.score) {
      best = { headerRowIndex: rowIndex, columnIndex, score };
    }
  }

  if (!best) {
    throw new Error(
      "Could not find sales report headers. Expected columns like Invoice, Posting Date, Net Total, and Grand Total on any row.",
    );
  }

  return best;
};

const isSummaryRow = (invoice, netTotal, grandTotal) => {
  const invoiceText = String(invoice || "").trim().toLowerCase();
  if (!invoiceText && netTotal === null && grandTotal === null) return true;
  if (
    invoiceText.includes("total") ||
    invoiceText.includes("grand total") ||
    invoiceText === "sales report"
  ) {
    return true;
  }
  return false;
};

const rowToRecord = (row, columnIndex) => {
  const invoice = pickCell(row, columnIndex.invoice);
  const netTotal = parseNumber(pickCell(row, columnIndex.netTotal));
  const grandTotal = parseNumber(pickCell(row, columnIndex.grandTotal));

  if (isSummaryRow(invoice, netTotal, grandTotal)) {
    return null;
  }

  return {
    sNo: pickCell(row, columnIndex.sNo),
    branch: pickCell(row, columnIndex.branch),
    invoice: invoice ? String(invoice).trim() : null,
    postingDate: formatSalesDisplayDate(pickCell(row, columnIndex.postingDate)),
    customersName: pickCell(row, columnIndex.customersName),
    customersGstin: pickCell(row, columnIndex.customersGstin),
    salesOrder: pickCell(row, columnIndex.salesOrder),
    deliveryNote: pickCell(row, columnIndex.deliveryNote),
    purchaseOrder: pickCell(row, columnIndex.purchaseOrder),
    netTotal,
    outputTaxCgst: parseNumber(pickCell(row, columnIndex.outputTaxCgst)),
    outputTaxSgst: parseNumber(pickCell(row, columnIndex.outputTaxSgst)),
    outputTaxIgst: parseNumber(pickCell(row, columnIndex.outputTaxIgst)),
    grandTotal,
  };
};

const parseMatrix = (matrix) => {
  const { headerRowIndex, columnIndex } = findHeaderRow(matrix);
  const rows = [];

  for (let i = headerRowIndex + 1; i < matrix.length; i += 1) {
    const record = rowToRecord(matrix[i], columnIndex);
    if (record) rows.push(record);
  }

  if (!rows.length) {
    throw new Error("No sales data rows found below the header row.");
  }

  return { rows, headerRowIndex };
};

const sheetToMatrix = (sheet) =>
  XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });

const parseWorkbook = (workbook) => {
  let bestResult = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    try {
      const matrix = sheetToMatrix(sheet);
      const { rows, headerRowIndex } = parseMatrix(matrix);
      if (!bestResult || rows.length > bestResult.rows.length) {
        bestResult = { rows, sheetName, headerRowIndex };
      }
    } catch {
      // Try the next sheet.
    }
  }

  if (!bestResult) {
    throw new Error(
      "Could not find sales report headers in any sheet. Make sure the file includes Invoice, Posting Date, Net Total, and Grand Total columns.",
    );
  }

  return bestResult;
};

export const parseSalesDataFile = (buffer, originalName = "") => {
  const lowerName = String(originalName).toLowerCase();
  const isCsv = lowerName.endsWith(".csv");
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    ...(isCsv ? { raw: false } : {}),
  });

  const parsed = parseWorkbook(workbook);
  return {
    rows: parsed.rows,
    sheetName: parsed.sheetName,
    headerRowIndex: parsed.headerRowIndex,
    sourceType: isCsv ? "csv" : "excel",
  };
};
