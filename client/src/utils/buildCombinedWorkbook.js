import * as XLSX from "xlsx-js-style";
import { gstr2bHeaders } from "./gstr2bHeaders";

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const getFirstValue = (row = {}, keys = []) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return "";
};

const buildRowSignature = (row = {}) =>
  [
    getFirstValue(row, ["referenceNo", "Reference No.", "vchNo", "Vch No"]),
    getFirstValue(row, ["supplierName", "Supplier Name"]),
    getFirstValue(row, ["gstinUin", "GSTIN/UIN", "gstin", "GSTIN"]),
    getFirstValue(row, ["invoiceNumber", "Invoice Number"]),
    getFirstValue(row, [
      "supplierAmount",
      "Supplier Amount",
      "invoiceAmount",
      "Invoice Amount",
    ]),
  ]
    .map((value) => (value !== undefined && value !== null ? String(value) : ""))
    .join("::");

const createSheetFromRows = (rows = [], header) => {
  if (!rows.length) {
    return XLSX.utils.aoa_to_sheet([["No data available"]]);
  }
  if (header?.length) {
    return XLSX.utils.json_to_sheet(rows, { header });
  }
  return XLSX.utils.json_to_sheet(rows);
};

const buildGstr2BSheet = (rows = []) => {
  if (!rows.length) {
    return XLSX.utils.aoa_to_sheet([["No GSTR-2B data available"]]);
  }
  const worksheetRows = rows.map((row) => {
    const entry = {};
    gstr2bHeaders.forEach(({ key, label }) => {
      entry[label] = row?.[key] ?? "";
    });
    return entry;
  });
  return XLSX.utils.json_to_sheet(worksheetRows);
};

const createRowSkeleton = (headers = []) => {
  const skeleton = {};
  headers.forEach((header) => {
    skeleton[header] = "";
  });
  return skeleton;
};

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

// Disallow ledger names that should be separated into a disallow sheet
const DISALLOW_LEDGER_NAMES = [
  "Penalty [disallow]",
  "Repair of Vehicle [disallow]",
  "Insurance of Vehicle [disallow]",
  "Festival Exp. [disallow]",
];

const DISALLOW_LEDGER_SET = new Set(
  DISALLOW_LEDGER_NAMES.map((name) => name.toLowerCase())
);

const isDisallowLedger = (ledgerName) => {
  if (!ledgerName) return false;
  return DISALLOW_LEDGER_SET.has(String(ledgerName).trim().toLowerCase());
};

const normalizeActionValue = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "accept") return "Accept";
  if (lower === "reject") return "Reject";
  if (lower === "pending") return "Pending";
  return null;
};


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

export const buildCombinedWorkbook = ({
  originalRows = [],
  processedRows = [],
  processedHeaders = [],
  mismatchedRows = [],
  reverseChargeRows = [],
  disallowRows = [],
  restSheets = [],
  normalizeAcceptCreditValue = (value) => value,
}) => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: GSTR-2B
  const gstrSheet = buildGstr2BSheet(originalRows);
  XLSX.utils.book_append_sheet(workbook, gstrSheet, "GSTR2B");

  const derivedHeaders =
    processedHeaders && processedHeaders.length
      ? processedHeaders.slice()
      : processedRows[0]
      ? Object.keys(processedRows[0])
      : [];
  
  // Reorder headers to place Accept Credit, Action, Action Reason after Change Mode
  const reorderHeaders = (headers, columnsToInsert = ["Accept Credit", "Action", "Action Reason"]) => {
    const changeModeIndex = headers.findIndex((h) => h === "Change Mode" || h === "changeMode");
    if (changeModeIndex === -1) {
      // If Change Mode not found, just ensure columns exist
      const result = [...headers];
      columnsToInsert.forEach((col) => {
        if (!result.includes(col)) {
          result.push(col);
        }
      });
      return result;
    }
    
    const changeModeHeader = headers[changeModeIndex];
    const beforeChangeMode = headers.slice(0, changeModeIndex);
    const afterChangeMode = headers.slice(changeModeIndex + 1);
    
    // Remove these columns from their original positions
    const filteredBefore = beforeChangeMode.filter(
      (h) => !columnsToInsert.includes(h)
    );
    const filteredAfter = afterChangeMode.filter(
      (h) => !columnsToInsert.includes(h)
    );
    
    // Always insert the columns after Change Mode
    return [...filteredBefore, changeModeHeader, ...columnsToInsert, ...filteredAfter];
  };
  
  const reorderedHeaders = reorderHeaders(derivedHeaders.filter((h) => h !== "Category"), ["Accept Credit", "Action", "Action Reason"]);
  
  // Ensure GSTR-2B columns are included in master headers
  const additionalHeaders = [];
  if (!reorderedHeaders.includes("GSTR-2B Invoice Value")) {
    additionalHeaders.push("GSTR-2B Invoice Value");
  }
  if (!reorderedHeaders.includes("GSTR-2B Taxable Value")) {
    additionalHeaders.push("GSTR-2B Taxable Value");
  }
  if (!reorderedHeaders.includes("ITC Availability")) {
    additionalHeaders.push("ITC Availability");
  }
  let masterHeaders = ["Category", ...reorderedHeaders, ...additionalHeaders];

  const mapRowWithCategory = (row, categoryLabel) => {
    const mapped = createRowSkeleton(masterHeaders);
    masterHeaders.forEach((header) => {
      if (header === "Category") {
        mapped.Category = categoryLabel;
      } else if (row && Object.prototype.hasOwnProperty.call(row, header)) {
        mapped[header] = row[header];
      }
    });
    return mapped;
  };

  // Build signature sets
  const reverseSignatures = new Set(reverseChargeRows.map((row) => buildRowSignature(row)));
  const disallowSignatures = new Set(disallowRows.map((row) => buildRowSignature(row)));
  const mismatchedAcceptStatus = new Map();
  mismatchedRows.forEach((row) => {
    const sig = buildRowSignature(row);
    const normalized = normalizeAcceptCreditValue(row?.["Accept Credit"]);
    mismatchedAcceptStatus.set(sig, normalized || "No");
  });

  const greenRows = [];
  const orangeRows = [];
  const purpleRows = [];
  const redRows = disallowRows.slice();
  const redSignatureSet = new Set(disallowRows.map((row) => buildRowSignature(row)));

  const greenSignatureSet = new Set();

  // First, filter RCM rows - move disallow ledger names or ITC Availability = "No" to redRows
  reverseChargeRows.forEach((row) => {
    const sig = buildRowSignature(row);
    const ledgerName = row?.["Ledger Name"];
    const itcAvailability = row?.["ITC Availability"];
    const isItcNo = itcAvailability === "No";
    
    if (isDisallowLedger(ledgerName) || isItcNo) {
      // Move to disallow rows if not already there
      if (!redSignatureSet.has(sig)) {
        redRows.push(row);
        redSignatureSet.add(sig);
      }
    } else {
      purpleRows.push(row);
    }
  });

  processedRows.forEach((row) => {
    const sig = buildRowSignature(row);
    const acceptStatus = mismatchedAcceptStatus.get(sig);
    const isOrange = acceptStatus === "No" || (!acceptStatus && mismatchedAcceptStatus.has(sig));
    const itcAvailability = row?.["ITC Availability"];
    const isItcNo = itcAvailability === "No";
    
    // Move ITC Availability = "No" rows to disallow rows
    if (isItcNo && !redSignatureSet.has(sig)) {
      redRows.push(row);
      redSignatureSet.add(sig);
      return;
    }
    
    if (disallowSignatures.has(sig) || reverseSignatures.has(sig) || isOrange) {
      return;
    }
    greenRows.push(row);
    greenSignatureSet.add(sig);
  });

  mismatchedRows.forEach((row) => {
    const normalized = normalizeAcceptCreditValue(row?.["Accept Credit"]);
    const sig = buildRowSignature(row);
    const ledgerName = row?.["Ledger Name"];
    const itcAvailability = row?.["ITC Availability"];
    const isItcNo = itcAvailability === "No";
    
    // Check if this mismatched row has ITC Availability = "No" or disallow ledger name
    if (isItcNo || isDisallowLedger(ledgerName)) {
      // Move to disallow rows if not already there
      if (!redSignatureSet.has(sig)) {
        redRows.push(row);
        redSignatureSet.add(sig);
      }
      return; // Don't add to green or orange
    }
    
    if (normalized === "Yes" && !greenSignatureSet.has(sig)) {
      greenRows.push(row);
      greenSignatureSet.add(sig);
    }
  });

  mismatchedRows.forEach((row) => {
    const normalized = normalizeAcceptCreditValue(row?.["Accept Credit"]);
    const sig = buildRowSignature(row);
    const ledgerName = row?.["Ledger Name"];
    
    // Skip if already moved to disallow rows
    if (isDisallowLedger(ledgerName) || redSignatureSet.has(sig)) {
      return;
    }
    
    if (normalized === "No" || !normalized) {
      orangeRows.push(row);
    }
  });

  const masterRows = [];
  const masterRowStyles = new Map();

  const pushSection = (rows, color, label) => {
    rows.forEach((row) => {
      const mapped = mapRowWithCategory(row, label);
      masterRowStyles.set(masterRows.length, color);
      masterRows.push(mapped);
    });
    if (rows.length) {
      masterRows.push({ Category: "" });
    }
  };

  pushSection(greenRows, COLOR_MAP.green, "Allowed (Green)");
  pushSection(orangeRows, COLOR_MAP.orange, "Mismatched - Accept Credit No");
  pushSection(purpleRows, COLOR_MAP.purple, "RCM");
  pushSection(redRows, COLOR_MAP.red, "Disallow");

  // Helper function to get GSTR-2B invoice value for a processed row
  // Use the stored value from the processed row directly
  const getGstr2bInvoiceValue = (row) => {
    const value = row?.["GSTR-2B Invoice Value"];
    if (value === null || value === undefined || value === "") return 0;
    return toNumber(value);
  };

  // Helper function to get GSTR-2B taxable value for a processed row
  // Use the stored value from the processed row directly
  const getGstr2bTaxableValue = (row) => {
    const value = row?.["GSTR-2B Taxable Value"];
    if (value === null || value === undefined || value === "") return 0;
    return toNumber(value);
  };

  // Helper function to get tax values from processed row
  const getTaxValue = (row, fieldName) => {
    return toNumber(row?.[fieldName]);
  };

  // Helper function to sum a field across rows
  const sumField = (rows, getValueFn) =>
    rows.reduce((total, row) => total + getValueFn(row), 0);

  // Helper function to sum all tax fields (IGST, CGST, SGST, CESS)
  const sumTaxFields = (rows) => {
    let igstTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let cessTotal = 0;

    rows.forEach((row) => {
      // Sum all slab-specific tax fields
      ["5%", "12%", "18%", "28%"].forEach((slab) => {
        igstTotal += toNumber(row?.[`IGST Rate ${slab}`] ?? 0);
        cgstTotal += toNumber(row?.[`CGST Rate ${slab}`] ?? 0);
        sgstTotal += toNumber(row?.[`SGST/UTGST Rate ${slab}`] ?? 0);
      });
      // Sum custom tax fields (for mismatched rows)
      igstTotal += toNumber(row?.["Custom IGST Rate"] ?? 0);
      cgstTotal += toNumber(row?.["Custom CGST Rate"] ?? 0);
      sgstTotal += toNumber(row?.["Custom SGST/UTGST"] ?? 0);
      // CESS is in a single column
      cessTotal += toNumber(row?.["Cess"] ?? 0);
    });

    return { igstTotal, cgstTotal, sgstTotal, cessTotal };
  };

  const allColoredRows = [...greenRows, ...orangeRows, ...purpleRows, ...redRows];

  // Calculate totals for each category
  const calculateCategoryTotals = (rows) => {
    const gstr2bInvoiceTotal = sumField(rows, getGstr2bInvoiceValue);
    const taxableValueTotal = sumField(rows, getGstr2bTaxableValue);
    const taxes = sumTaxFields(rows);
    const supplierAmountTotal = sumField(rows, (row) =>
      toNumber(
        row?.supplierAmount ??
          row?.["supplierAmount"] ??
          row?.["Supplier Amount"] ??
          row?.invoiceAmount ??
          row?.["Invoice Amount"]
      )
    );
    const invoiceAmountTotal = sumField(rows, (row) =>
      toNumber(row?.invoiceAmount ?? row?.["Invoice Amount"])
    );

    return {
      gstr2bInvoiceTotal,
      taxableValueTotal,
      ...taxes,
      supplierAmountTotal,
      invoiceAmountTotal,
    };
  };

  const greenTotals = calculateCategoryTotals(greenRows);
  const orangeTotals = calculateCategoryTotals(orangeRows);
  const purpleTotals = calculateCategoryTotals(purpleRows);
  const redTotals = calculateCategoryTotals(redRows);

  // Calculate grand totals
  const grandTotals = {
    gstr2bInvoiceTotal:
      greenTotals.gstr2bInvoiceTotal +
      orangeTotals.gstr2bInvoiceTotal +
      purpleTotals.gstr2bInvoiceTotal +
      redTotals.gstr2bInvoiceTotal,
    taxableValueTotal:
      greenTotals.taxableValueTotal +
      orangeTotals.taxableValueTotal +
      purpleTotals.taxableValueTotal +
      redTotals.taxableValueTotal,
    igstTotal:
      greenTotals.igstTotal +
      orangeTotals.igstTotal +
      purpleTotals.igstTotal +
      redTotals.igstTotal,
    cgstTotal:
      greenTotals.cgstTotal +
      orangeTotals.cgstTotal +
      purpleTotals.cgstTotal +
      redTotals.cgstTotal,
    sgstTotal:
      greenTotals.sgstTotal +
      orangeTotals.sgstTotal +
      purpleTotals.sgstTotal +
      redTotals.sgstTotal,
    cessTotal:
      greenTotals.cessTotal +
      orangeTotals.cessTotal +
      purpleTotals.cessTotal +
      redTotals.cessTotal,
    supplierAmountTotal:
      greenTotals.supplierAmountTotal +
      orangeTotals.supplierAmountTotal +
      purpleTotals.supplierAmountTotal +
      redTotals.supplierAmountTotal,
    invoiceAmountTotal:
      greenTotals.invoiceAmountTotal +
      orangeTotals.invoiceAmountTotal +
      purpleTotals.invoiceAmountTotal +
      redTotals.invoiceAmountTotal,
  };

  if (masterRows.length) {
    masterRows.push({ Category: "" });
  }

  const totalsColumnNames = [
    "GSTR-2B Invoice",
    "GSTR-2B Taxable",
    "IGST Total",
    "CGST Total",
    "SGST Total",
    "CESS Total",
    "Supplier Amount",
    "Invoice Amount",
  ];

  const assignCompactTotals = (totals) => [
    totals.gstr2bInvoiceTotal || 0,
    totals.taxableValueTotal || 0,
    totals.igstTotal || 0,
    totals.cgstTotal || 0,
    totals.sgstTotal || 0,
    totals.cessTotal || 0,
    totals.supplierAmountTotal || 0,
    totals.invoiceAmountTotal || 0,
  ];

  const categoryTotals = [
    { label: "Green Total", totals: greenTotals, color: COLOR_MAP.green },
    { label: "Orange Total", totals: orangeTotals, color: COLOR_MAP.orange },
    { label: "Purple Total", totals: purpleTotals, color: COLOR_MAP.purple },
    { label: "Red Total", totals: redTotals, color: COLOR_MAP.red },
  ];

  const actionTotals = [
    { key: "Accept", label: "Action Accept Total", color: COLOR_MAP.accept },
    { key: "Reject", label: "Action Reject Total", color: COLOR_MAP.reject },
    { key: "Pending", label: "Action Pending Total", color: COLOR_MAP.pending },
    { key: null, label: "Action No Action Total", color: COLOR_MAP.none },
  ];
  const sumAction = (target) =>
    processedRows.reduce((total, row) => {
      const normalized = normalizeActionValue(row?.Action);
      if (target === null) {
        return normalized ? total : total + toNumber(
          row?.supplierAmount ??
            row?.["supplierAmount"] ??
            row?.["Supplier Amount"] ??
            row?.invoiceAmount ??
            row?.["Invoice Amount"]
        );
      }
      if (normalized === target) {
        return (
          total +
          toNumber(
            row?.supplierAmount ??
              row?.["supplierAmount"] ??
              row?.["Supplier Amount"] ??
              row?.invoiceAmount ??
              row?.["Invoice Amount"]
          )
        );
      }
      return total;
    }, 0);
  const actionTotalsWithValues = actionTotals.map((entry) => ({
    ...entry,
    value: sumAction(entry.key),
  }));
  const actionGrandTotal = actionTotalsWithValues.reduce(
    (sum, entry) => sum + entry.value,
    0
  );
  masterRows.push({ Category: "" });

  const masterSheet = createSheetFromRows(masterRows, masterHeaders);
  masterRowStyles.forEach((color, rowIndex) => {
    applyRowStyle(masterSheet, masterHeaders, rowIndex, color);
  });

  const additionalAoA = [];
  const additionalRowStyles = [];

  additionalAoA.push(["", ...totalsColumnNames]);
  additionalRowStyles.push(null);

  categoryTotals.forEach((entry) => {
    additionalAoA.push([entry.label, ...assignCompactTotals(entry.totals)]);
    additionalRowStyles.push(entry.color);
  });

  additionalAoA.push(["Grand Total", ...assignCompactTotals(grandTotals)]);
  additionalRowStyles.push(COLOR_MAP.grand);

  additionalAoA.push([]);
  additionalRowStyles.push(null);

  additionalAoA.push(["Action Category", "Amount"]);
  additionalRowStyles.push(null);

  actionTotalsWithValues.forEach((entry) => {
    additionalAoA.push([entry.label, entry.value || 0]);
    additionalRowStyles.push(entry.color);
  });
  additionalAoA.push(["Action Grand Total", actionGrandTotal || 0]);
  additionalRowStyles.push(COLOR_MAP.actionGrand);

  if (additionalAoA.length) {
    const originRow = masterRows.length + 1;
    XLSX.utils.sheet_add_aoa(masterSheet, additionalAoA, {
      origin: { r: originRow, c: 0 },
    });
    additionalRowStyles.forEach((color, idx) => {
      if (!color) return;
      applyRowStyle(masterSheet, masterHeaders, masterRows.length + idx, color);
    });
  }
  XLSX.utils.book_append_sheet(workbook, masterSheet, "Master");

  // Helper function to ensure columns are in headers
  const ensureColumnsInHeaders = (headers, columnsToAdd) => {
    const result = [...headers];
    columnsToAdd.forEach((col) => {
      if (!result.includes(col)) {
        result.push(col);
      }
    });
    return result;
  };

  // Helper function to reorder columns to place specific columns after Change Mode
  const reorderSheetHeaders = (headers, columnsToInsert) => {
    const changeModeIndex = headers.findIndex((h) => h === "Change Mode" || h === "changeMode");
    if (changeModeIndex === -1) {
      return ensureColumnsInHeaders(headers, columnsToInsert);
    }
    
    const changeModeHeader = headers[changeModeIndex];
    const beforeChangeMode = headers.slice(0, changeModeIndex);
    const afterChangeMode = headers.slice(changeModeIndex + 1);
    
    // Remove columns from their original positions
    const filteredBefore = beforeChangeMode.filter(
      (h) => !columnsToInsert.includes(h)
    );
    const filteredAfter = afterChangeMode.filter(
      (h) => !columnsToInsert.includes(h)
    );
    
    // Always insert the columns after Change Mode
    return [...filteredBefore, changeModeHeader, ...columnsToInsert, ...filteredAfter];
  };

  // Remaining sheets
  // Processed sheet: Accept Credit, Action, Action Reason
  const processedSheetHeaders = ensureColumnsInHeaders(derivedHeaders, ["Accept Credit", "Action", "Action Reason"]);
  const processedHeadersOrdered = reorderSheetHeaders(processedSheetHeaders, ["Accept Credit", "Action", "Action Reason"]);
  const tallySheet = createSheetFromRows(processedRows, processedHeadersOrdered);
  XLSX.utils.book_append_sheet(workbook, tallySheet, "TallyProcessed");

  // Mismatched sheet: Accept Credit, Action, Action Reason
  const mismatchedHeaders = mismatchedRows[0] ? Object.keys(mismatchedRows[0]) : [];
  const mismatchedHeadersWithColumns = ensureColumnsInHeaders(mismatchedHeaders, ["Accept Credit", "Action", "Action Reason"]);
  const mismatchedHeadersOrdered = reorderSheetHeaders(mismatchedHeadersWithColumns, ["Accept Credit", "Action", "Action Reason"]);
  const mismatchedSheet = createSheetFromRows(mismatchedRows, mismatchedHeadersOrdered);
  XLSX.utils.book_append_sheet(workbook, mismatchedSheet, "Mismatched");

  // RCM sheet: Action, Action Reason (no Accept Credit)
  const rcmHeaders = reverseChargeRows[0] ? Object.keys(reverseChargeRows[0]) : [];
  const rcmHeadersWithColumns = ensureColumnsInHeaders(rcmHeaders, ["Action", "Action Reason"]);
  const rcmHeadersOrdered = reorderSheetHeaders(rcmHeadersWithColumns, ["Action", "Action Reason"]);
  const rcmSheet = createSheetFromRows(reverseChargeRows, rcmHeadersOrdered);
  XLSX.utils.book_append_sheet(workbook, rcmSheet, "RCM");

  // Disallow sheet: Action, Action Reason (no Accept Credit)
  const disallowHeaders = disallowRows[0] ? Object.keys(disallowRows[0]) : [];
  const disallowHeadersWithColumns = ensureColumnsInHeaders(disallowHeaders, ["Action", "Action Reason"]);
  const disallowHeadersOrdered = reorderSheetHeaders(disallowHeadersWithColumns, ["Action", "Action Reason"]);
  const disallowSheet = createSheetFromRows(
    disallowRows,
    disallowHeadersOrdered
  );
  XLSX.utils.book_append_sheet(workbook, disallowSheet, "Disallow");

  if (restSheets?.length) {
    const restData = [];
    restSheets.forEach(({ sheetName, headers = [], rows = [] }) => {
      const normalizedHeaders =
        headers.length > 0
          ? headers
          : rows.length > 0
          ? Object.keys(rows[0])
          : [];
      restData.push([sheetName || "Sheet"]);
      if (normalizedHeaders.length) {
        restData.push(normalizedHeaders);
      } else {
        restData.push(["No headers detected"]);
      }
      if (rows.length) {
        rows.forEach((row) => {
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

  return workbook;
};

