import { upsert as upsertProcessedSalesData } from "../models/processedSalesDataModel.js";
import { SALES_OUTPUT_COLUMNS } from "./salesDataConstants.js";
import { parseNumber } from "./salesDataParser.js";
import { formatSalesDisplayDate } from "./salesDataDate.js";

const isZeroOrNull = (value) => {
  const parsed = parseNumber(value);
  return parsed === null || parsed === 0;
};

const determineLedger = (netTotal, cgst, sgst, igst) => {
  const net = parseNumber(netTotal) || 0;
  const c = parseNumber(cgst) || 0;
  const s = parseNumber(sgst) || 0;
  const i = parseNumber(igst) || 0;
  const amountTolerance = 0.5;

  if (net > 0 && c > 0 && s > 0) {
    const expectedHalfPercent = net * 0.005;
    if (
      Math.abs(c - expectedHalfPercent) <= amountTolerance &&
      Math.abs(s - expectedHalfPercent) <= amountTolerance
    ) {
      return "Sales GST OGS@0.10%";
    }
  }

  if (isZeroOrNull(c) && isZeroOrNull(s) && isZeroOrNull(i)) {
    return "Sales (Export)";
  }

  if (!isZeroOrNull(c) && !isZeroOrNull(s) && isZeroOrNull(i)) {
    return "Sales GST @18%";
  }

  if (!isZeroOrNull(i) && isZeroOrNull(c) && isZeroOrNull(s)) {
    return "Sales GST OGS@18%";
  }

  if (!isZeroOrNull(i)) return "Sales GST OGS@18%";
  if (!isZeroOrNull(c) || !isZeroOrNull(s)) return "Sales GST @18%";
  return "Sales (Export)";
};

const roundMoney = (value) => {
  if (value === null || value === undefined) return null;
  const rounded = Math.round(value * 100) / 100;
  return Math.abs(rounded) < 0.01 ? null : rounded;
};

const computeRoundOff = (netTotal, cgst, sgst, igst, grandTotal) => {
  const net = parseNumber(netTotal) || 0;
  const c = parseNumber(cgst) || 0;
  const s = parseNumber(sgst) || 0;
  const i = parseNumber(igst) || 0;
  const grand = parseNumber(grandTotal) || 0;
  const computedSum = net + c + s + i;
  const diff = grand - computedSum;

  if (Math.abs(diff) < 0.01) {
    return { roundOffDr: null, roundOffCr: null };
  }

  if (diff < 0) {
    return { roundOffDr: roundMoney(Math.abs(diff)), roundOffCr: null };
  }

  return { roundOffDr: null, roundOffCr: roundMoney(diff) };
};

export const processSalesRow = (row) => {
  const invoice = row?.invoice ? String(row.invoice).trim() : "";
  const netTotal = parseNumber(row?.netTotal);
  const cgst = parseNumber(row?.outputTaxCgst);
  const sgst = parseNumber(row?.outputTaxSgst);
  const igst = parseNumber(row?.outputTaxIgst);
  const grandTotal = parseNumber(row?.grandTotal);
  const { roundOffDr, roundOffCr } = computeRoundOff(
    netTotal,
    cgst,
    sgst,
    igst,
    grandTotal,
  );

  return {
    "Invoice date": formatSalesDisplayDate(row?.postingDate),
    "Voucher Type": "GST Sales",
    "Voucher No.": invoice || null,
    "Invoice No.": invoice || null,
    Ledger: determineLedger(netTotal, cgst, sgst, igst),
    "Customer Name": row?.customersName ?? null,
    "Customer GSTIN": row?.customersGstin ?? null,
    "Taxable Amount": netTotal,
    "CGST Tax": cgst,
    "SGST Tax": sgst,
    "IGST Tax": igst,
    "Round OFF DR": roundOffDr,
    "Round OFF CR": roundOffCr,
    "Grand Total": grandTotal,
  };
};

export const processSalesRows = (rows = []) =>
  rows.map((row) => processSalesRow(row));

export const processAndStoreSalesDocument = async (doc) => {
  if (!doc) throw new Error("Invalid sales data document");
  const rows = Array.isArray(doc.rows) ? doc.rows : [];
  if (!rows.length) return null;

  const processedRows = processSalesRows(rows);
  const payload = {
    _id: doc._id,
    company: doc.company,
    companySnapshot: doc.companySnapshot || {},
    processedRows,
    outputColumns: SALES_OUTPUT_COLUMNS,
    processedAt: new Date().toISOString(),
  };

  await upsertProcessedSalesData(payload);
  return payload;
};
