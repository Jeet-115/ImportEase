import { findAll as findAllGstin } from "../models/gstinnumbermodel.js";
import {
  findAll as findAllImports,
} from "../models/gstr2bimportmodel.js";
import { upsert as upsertProcessedFile } from "../models/processedfilemodel.js";

const SLAB_CONFIG = [
  { label: "5%", igst: 5, cgst: 2.5, sgst: 2.5 },
  { label: "12%", igst: 12, cgst: 6, sgst: 6 },
  { label: "18%", igst: 18, cgst: 9, sgst: 9 },
  { label: "28%", igst: 28, cgst: 14, sgst: 14 },
];

const LEDGER_KEYS = {
  "5%": {
    ledgerAmount: "Ledger Amount 5%",
    ledgerCrDr: "Ledger DR/CR 5%",
    igst: "IGST Rate 5%",
    cgst: "CGST Rate 5%",
    sgst: "SGST/UTGST Rate 5%",
  },
  "12%": {
    ledgerAmount: "Ledger Amount 12%",
    ledgerCrDr: "Ledger DR/CR 12%",
    igst: "IGST Rate 12%",
    cgst: "CGST Rate 12%",
    sgst: "SGST/UTGST Rate 12%",
  },
  "18%": {
    ledgerAmount: "Ledger Amount 18%",
    ledgerCrDr: "Ledger DR/CR 18%",
    igst: "IGST Rate 18%",
    cgst: "CGST Rate 18%",
    sgst: "SGST/UTGST Rate 18%",
  },
  "28%": {
    ledgerAmount: "Ledger Amount 28%",
    ledgerCrDr: "Ledger DR/CR 28%",
    igst: "IGST Rate 28%",
    cgst: "CGST Rate 28%",
    sgst: "SGST/UTGST Rate 28%",
  },
};

const LEDGER_NAME_COLUMN = "Ledger Name";

let cachedStateMap = null;

const parseNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const determineSlab = (taxableValue, igst, cgst) => {
  if (!taxableValue) return null;
  const tolerance = 0.1;

  if (igst > 0) {
    const percent = (igst / taxableValue) * 100;
    const match = SLAB_CONFIG.find(
      (slab) => Math.abs(percent - slab.igst) <= tolerance
    );
    if (match) {
      return { slab: match.label, mode: "IGST" };
    }
  } else if (cgst > 0) {
    const percent = (cgst / taxableValue) * 100;
    const match = SLAB_CONFIG.find(
      (slab) => Math.abs(percent - slab.cgst) <= tolerance
    );
    if (match) {
      return { slab: match.label, mode: "CGST_SGST" };
    }
  }

  return null;
};

const initializeLedgerFields = () => {
  const fields = {};
  Object.keys(LEDGER_KEYS).forEach((slab) => {
    const keys = LEDGER_KEYS[slab];
    fields[keys.ledgerAmount] = null;
    fields[keys.ledgerCrDr] = null;
    fields[keys.igst] = null;
    fields[keys.cgst] = null;
    fields[keys.sgst] = null;
  });
  return fields;
};

const buildStateMap = async () => {
  if (cachedStateMap) return cachedStateMap;

  const rawResults = await findAllGstin();

  cachedStateMap = rawResults.reduce((acc, entry) => {
    if (entry?.gstCode && entry?.stateName) {
      acc.set(String(entry.gstCode).padStart(2, "0"), entry.stateName);
    }
    return acc;
  }, new Map());

  return cachedStateMap;
};

const processRowWithMap = (row, index, gstStateMap) => {
  const gstin = (row?.gstin || "").trim();
  const stateCode = gstin.slice(0, 2);
  const state = gstStateMap.get(stateCode) || null;

  const taxableValue = parseNumber(row?.taxableValue);
  const invoiceValue = parseNumber(row?.invoiceValue);
  const igst = parseNumber(row?.igst);
  const cgst = parseNumber(row?.cgst);
  const sgst = parseNumber(row?.sgst);

  const rawInvoiceDate =
    row?.invoiceDate !== undefined && row?.invoiceDate !== null
      ? String(row.invoiceDate).trim()
      : null;

  const base = {
    slNo: index + 1,
    date: rawInvoiceDate,
    vchNo: row?.invoiceNumber || null,
    vchType: "PURCHASE",
    referenceNo: row?.invoiceNumber || null,
    referenceDate: rawInvoiceDate,
    supplierName: row?.tradeName || null,
    gstRegistrationType: row?.invoiceType || null,
    gstinUin: gstin || null,
    state,
    supplierState: row?.placeOfSupply || null,
    supplierAmount: null,
    supplierDrCr: "CR",
    [LEDGER_NAME_COLUMN]: null,
    ...initializeLedgerFields(),
    groAmount: null,
    roundOffDr: null,
    roundOffCr: null,
    invoiceAmount: null,
    changeMode: "Accounting Invoice",
  };

  const slab = determineSlab(taxableValue, igst, cgst);
  let ledgerAmount = taxableValue;
  let igstApplied = igst;
  let cgstApplied = cgst;
  let sgstApplied = sgst;

  let isMismatched = false;

  if (slab && ledgerAmount) {
    const keys = LEDGER_KEYS[slab.slab];
    base[keys.ledgerAmount] = ledgerAmount;
    base[keys.ledgerCrDr] = "DR";

    if (slab.mode === "IGST") {
      base[keys.igst] = igstApplied;
      cgstApplied = 0;
      sgstApplied = 0;
    } else {
      base[keys.cgst] = cgstApplied;
      base[keys.sgst] = sgstApplied;
      igstApplied = 0;
    }
  } else {
    ledgerAmount = invoiceValue || taxableValue;
    isMismatched = true;
  }

  const groAmount = parseFloat(
    ((ledgerAmount || 0) + igstApplied + cgstApplied + sgstApplied).toFixed(2)
  );

  let roundOffDr = 0;
  let roundOffCr = 0;
  const decimalPart = groAmount - Math.floor(groAmount);

  if (decimalPart > 0) {
    if (decimalPart >= 0.5) {
      roundOffCr = parseFloat((Math.ceil(groAmount) - groAmount).toFixed(2));
    } else {
      roundOffDr = parseFloat((groAmount - Math.floor(groAmount)).toFixed(2));
    }
  }

  const invoiceAmount = parseFloat(
    (groAmount + roundOffCr - roundOffDr).toFixed(2)
  );

  base.groAmount = groAmount;
  base.roundOffDr = roundOffDr || null;
  base.roundOffCr = roundOffCr || null;
  base.invoiceAmount = invoiceAmount;
  base.supplierAmount = invoiceAmount;

  return { record: base, isMismatched };
};

export const processRows = async (rows) => {
  const gstStateMap = await buildStateMap();
  const matchedRows = [];
  const mismatchedRows = [];
  const reverseChargeRows = [];

  let reverseChargeCount = 0;
  rows.forEach((row, index) => {
    // Check if this row has reverse charge = "yes"
    // Handle various formats: "yes", "Yes", "YES", "Y", "1", true, etc.
    const reverseChargeValue = row?.reverseCharge;
    let isReverseCharge = false;
    
    if (reverseChargeValue !== null && reverseChargeValue !== undefined) {
      const normalized = String(reverseChargeValue).trim().toLowerCase();
      // Check for "yes", "y", "1", or boolean true
      isReverseCharge = 
        normalized === "yes" || 
        normalized === "y" || 
        normalized === "1" ||
        normalized === "true" ||
        reverseChargeValue === true ||
        reverseChargeValue === 1;
      
      // Debug: log first few reverse charge values to verify
      if (index < 5) {
        console.log(`Row ${index}: reverseChargeValue="${reverseChargeValue}", normalized="${normalized}", isReverseCharge=${isReverseCharge}`);
      }
    }

    const { record, isMismatched } = processRowWithMap(
      row,
      index,
      gstStateMap
    );

    // If reverse charge, add to reverseChargeRows and skip adding to matched/mismatched
    if (isReverseCharge) {
      reverseChargeRows.push(record);
      reverseChargeCount++;
    } else if (isMismatched) {
      mismatchedRows.push(record);
    } else {
      matchedRows.push(record);
    }
  });
  
  console.log(`Processing complete: ${reverseChargeRows.length} reverse charge rows, ${matchedRows.length} matched rows, ${mismatchedRows.length} mismatched rows`);

  const renumber = (list) =>
    list.map((entry, idx) => ({
      ...entry,
      slNo: idx + 1,
    }));

  return {
    matchedRows: renumber(matchedRows),
    mismatchedRows: renumber(mismatchedRows),
    reverseChargeRows: renumber(reverseChargeRows),
  };
};

export const processAndStoreDocument = async (doc) => {
  if (!doc) throw new Error("Invalid GSTR-2B document");
  const rows = Array.isArray(doc.rows) ? doc.rows : [];
  if (!rows.length) return null;

  const { matchedRows, mismatchedRows, reverseChargeRows } = await processRows(rows);

  const payload = {
    _id: doc._id,
    company: doc.companySnapshot?.companyName || "Unknown",
    companySnapshot: doc.companySnapshot || {},
    processedRows: matchedRows,
    mismatchedRows,
    reverseChargeRows: reverseChargeRows || [],
    disallowRows: Array.isArray(doc.disallowRows) ? doc.disallowRows : [],
    processedAt: new Date(),
  };

  await upsertProcessedFile(payload);

  return payload;
};

export const processAllImports = async () => {
  const imports = await findAllImports();
  for (const doc of imports) {
    await processAndStoreDocument(doc);
  }
};

