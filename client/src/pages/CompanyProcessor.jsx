import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  FiAlertCircle,
  FiDownload,
  FiFilePlus,
  FiPlayCircle,
  FiRefreshCw,
  FiUploadCloud,
  FiPlus,
} from "react-icons/fi";
import { fetchGSTINNumbers } from "../services/gstinnumberservices";
import {
  uploadB2BSheet,
  processGstr2bImport,
  fetchProcessedFile,
} from "../services/gstr2bservice";
import {
  createLedgerName as createLedgerNameApi,
  fetchLedgerNames,
} from "../services/ledgernameservice";
import { gstr2bHeaders } from "../utils/gstr2bHeaders";
import { sanitizeFileName } from "../utils/fileUtils";
import BackButton from "../components/BackButton";

const columnMap = {
  gstin: "gstin",
  tradeName: "tradeName",
  invoiceNumber: "invoiceNumber",
  invoiceType: "invoiceType",
  invoiceDate: "invoiceDate",
  invoiceValue: "invoiceValue",
  placeOfSupply: "placeOfSupply",
  reverseCharge: "reverseCharge",
  taxableValue: "taxableValue",
  integratedTax: "igst",
  centralTax: "cgst",
  stateTax: "sgst",
  cess: "cess",
  gstrPeriod: "gstrPeriod",
  gstrFilingDate: "gstrFilingDate",
  itcAvailability: "itcAvailability",
  reason: "reason",
  taxRatePercent: "taxRatePercent",
  source: "source",
  irn: "irn",
  irnDate: "irnDate",
};

const slabConfig = [
  { slab: "5%", igst: 5, cgst: 2.5, sgst: 2.5 },
  { slab: "12%", igst: 12, cgst: 6, sgst: 6 },
  { slab: "18%", igst: 18, cgst: 9, sgst: 9 },
  { slab: "28%", igst: 28, cgst: 14, sgst: 14 },
];


const outputColumns = [
  "Sr no.",
  "Date",
  "Vch No",
  "VCH Type",
  "Reference No.",
  "Reference Date",
  "Supplier Name",
  "GST Registration Type",
  "GSTIN/UIN",
  "State",
  "Supplier State",
  "Supplier Amount",
  "Supplier Dr/Cr",
  "Ledger Name",
  "Ledger Amount 5%",
  "Ledger amount cr/dr 5%",
  "Ledger Amount 12%",
  "Ledger amount Cr/Dr 12%",
  "Ledger Amount 18%",
  "Ledger amount cr/dr 18%",
  "Ledger Amount 28%",
  "Ledger amount cr/dr 28%",
  "IGST Rate 5%",
  "CGST Rate 5%",
  "SGST/UTGST Rate 5%",
  "IGST Rate 12%",
  "CGST Rate 12%",
  "SGST/UTGST Rate 12%",
  "IGST Rate 18%",
  "CGST Rate 18%",
  "SGST/UTGST Rate 18%",
  "IGST Rate 28%",
  "CGST Rate 28%",
  "SGST/UTGST Rate 28%",
  "GRO Amount",
  "Round Off Dr",
  "Round Off Cr",
  "Invoice Amount",
  "Change Mode",
];

const ledgerKeyMap = {
  "5%": {
    ledgerAmount: "Ledger Amount 5%",
    ledgerCrDr: "Ledger amount cr/dr 5%",
    igst: "IGST Rate 5%",
    cgst: "CGST Rate 5%",
    sgst: "SGST/UTGST Rate 5%",
  },
  "12%": {
    ledgerAmount: "Ledger Amount 12%",
    ledgerCrDr: "Ledger amount Cr/Dr 12%",
    igst: "IGST Rate 12%",
    cgst: "CGST Rate 12%",
    sgst: "SGST/UTGST Rate 12%",
  },
  "18%": {
    ledgerAmount: "Ledger Amount 18%",
    ledgerCrDr: "Ledger amount cr/dr 18%",
    igst: "IGST Rate 18%",
    cgst: "CGST Rate 18%",
    sgst: "SGST/UTGST Rate 18%",
  },
  "28%": {
    ledgerAmount: "Ledger Amount 28%",
    ledgerCrDr: "Ledger amount cr/dr 28%",
    igst: "IGST Rate 28%",
    cgst: "CGST Rate 28%",
    sgst: "SGST/UTGST Rate 28%",
  },
};

const taxKeys = [
  "IGST Rate 5%",
  "CGST Rate 5%",
  "SGST/UTGST Rate 5%",
  "IGST Rate 12%",
  "CGST Rate 12%",
  "SGST/UTGST Rate 12%",
  "IGST Rate 18%",
  "CGST Rate 18%",
  "SGST/UTGST Rate 18%",
  "IGST Rate 28%",
  "CGST Rate 28%",
  "SGST/UTGST Rate 28%",
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
};

const pick = (row, label) => {
  if (!row || !label) return "";
  if (Array.isArray(label)) {
    for (const key of label) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return "";
  }
  return row[label] ?? "";
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toISOString().split("T")[0];
};

const toDisplayValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return String(value);
};

const CompanyProcessor = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const company = location.state?.company;

  const [sheetRows, setSheetRows] = useState([]);
  const [generatedRows, setGeneratedRows] = useState([]);
  const [fileMeta, setFileMeta] = useState({ name: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [gstStateMap, setGstStateMap] = useState({});
  const [loadingGST, setLoadingGST] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importId, setImportId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processedDoc, setProcessedDoc] = useState(null);
  const [downloadsUnlocked, setDownloadsUnlocked] = useState(false);
  const [ledgerNames, setLedgerNames] = useState([]);
  const [ledgerNamesLoading, setLedgerNamesLoading] = useState(false);
  const [ledgerEdits, setLedgerEdits] = useState({});
  const [addLedgerModal, setAddLedgerModal] = useState({
    open: false,
    value: "",
    submitting: false,
  });
  const processedRows = processedDoc?.processedRows || [];
  const processedColumns = useMemo(
    () => (processedRows[0] ? Object.keys(processedRows[0]) : []),
    [processedRows]
  );
  const hasProcessedRows = processedRows.length > 0;
  const ledgerOptionListId = "ledger-name-options";

  const getRowKey = useCallback(
    (row, index) => String(row?._id ?? row?.slNo ?? index),
    []
  );

  const initializeLedgerEdits = useCallback(
    (rows = []) => {
      setLedgerEdits(
        rows.reduce((acc, row, idx) => {
          const key = getRowKey(row, idx);
          const value = row?.["Ledger Name"];
          if (value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      );
    },
    [getRowKey]
  );

  const loadLedgerNames = useCallback(async () => {
    setLedgerNamesLoading(true);
    try {
      const { data } = await fetchLedgerNames();
      setLedgerNames(data || []);
    } catch (error) {
      console.error("Failed to load ledger names:", error);
      setStatus((prev) =>
        prev.type === "error"
          ? prev
          : {
              type: "error",
              message:
                "Unable to load ledger names. You can still type custom names.",
            }
      );
    } finally {
      setLedgerNamesLoading(false);
    }
  }, [setStatus]);

  useEffect(() => {
    loadLedgerNames();
  }, [loadLedgerNames]);

  const applyLedgerEdits = useCallback(
    (rows = []) =>
      rows.map((row, idx) => {
        const key = getRowKey(row, idx);
        if (!(key in ledgerEdits)) {
          return row;
        }
        return { ...row, "Ledger Name": ledgerEdits[key] || "" };
      }),
    [getRowKey, ledgerEdits]
  );

  const handleLedgerInputChange = (rowKey, value) => {
    setLedgerEdits((prev) => {
      const next = { ...prev };
      if (!value?.trim()) {
        delete next[rowKey];
      } else {
        next[rowKey] = value;
      }
      return next;
    });
    setProcessedDoc((prev) => {
      if (!prev?.processedRows) return prev;
      const nextRows = prev.processedRows.map((row, idx) => {
        const key = getRowKey(row, idx);
        if (key !== rowKey) {
          return row;
        }
        return { ...row, "Ledger Name": value };
      });
      return { ...prev, processedRows: nextRows };
    });
  };

  const openAddLedgerModal = () =>
    setAddLedgerModal({ open: true, value: "", submitting: false });

  const closeAddLedgerModal = () =>
    setAddLedgerModal({ open: false, value: "", submitting: false });

  const handleAddLedgerSubmit = async (event) => {
    event.preventDefault();
    const trimmed = addLedgerModal.value.trim();
    if (!trimmed) {
      setStatus({
        type: "error",
        message: "Ledger name cannot be empty.",
      });
      return;
    }
    setAddLedgerModal((prev) => ({ ...prev, submitting: true }));
    try {
      await createLedgerNameApi({ name: trimmed });
      setStatus({ type: "success", message: "Ledger name added." });
      await loadLedgerNames();
      setAddLedgerModal({ open: false, value: "", submitting: false });
    } catch (error) {
      console.error("Failed to add ledger name:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to add ledger name. Please try again.",
      });
      setAddLedgerModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  useEffect(() => {
    if (!company) return;
    const loadGST = async () => {
      setLoadingGST(true);
      try {
        const { data } = await fetchGSTINNumbers();
        const map = (data || []).reduce((acc, item) => {
          acc[item.gstCode.padStart(2, "0")] = item.stateName;
          return acc;
        }, {});
        setGstStateMap(map);
      } catch (error) {
        console.error("Failed to load GST state codes:", error);
        setStatus({
          type: "error",
          message: "Unable to load GST codes. State mapping may be empty.",
        });
      } finally {
        setLoadingGST(false);
      }
    };
    loadGST();
  }, [company]);

  useEffect(() => {
    if (!company) {
      const timer = setTimeout(() => navigate("/company-selector"), 2000);
      return () => clearTimeout(timer);
    }
  }, [company, navigate]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus({ type: "", message: "" });
    const snapshot = {
      _id: company._id,
      companyName: company.companyName,
      mailingName: company.mailingName,
      address: company.address,
      state: company.state,
      country: company.country,
      pincode: company.pincode,
      gstin: company.gstin,
      email: company.email,
      telephone: company.telephone,
    };

    uploadB2BSheet(file, {
      companyId: company._id,
      companySnapshot: snapshot,
    })
      .then(({ data }) => {
        setFileMeta({ name: file.name });
        setSheetRows(data.rows || []);
        setGeneratedRows([]);
        setImportId(data._id || null);
        setProcessedDoc(null);
        setLedgerEdits({});
        setStatus({
          type: "success",
          message: `Imported ${data.rows?.length || 0} rows from B2B sheet.`,
        });
        setDownloadsUnlocked(false);
      })
      .catch((error) => {
        console.error("Failed to upload B2B sheet:", error);
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            "Unable to process the B2B sheet. Please try again.",
        });
      })
      .finally(() => setUploading(false));
  };

  const determineSlab = (taxableValue, igst, cgst) => {
    if (!taxableValue) return null;
    const tolerance = 0.05; // percent tolerance

    if (igst > 0) {
      const percent = (igst / taxableValue) * 100;
      const match = slabConfig.find(
        (slab) => Math.abs(percent - slab.igst) <= tolerance
      );
      if (match) {
        return { ...match, mode: "IGST" };
      }
    } else if (cgst > 0) {
      const percent = (cgst / taxableValue) * 100;
      const match = slabConfig.find(
        (slab) => Math.abs(percent - slab.cgst) <= tolerance
      );
      if (match) {
        return { ...match, mode: "CGST_SGST" };
      }
    }

    return null;
  };

  const buildRow = (row, index) => {
    const invoiceDate = pick(row, columnMap.invoiceDate);
    const invoiceNumber = pick(row, columnMap.invoiceNumber);
    const taxableValue = toNumber(pick(row, columnMap.taxableValue));
    const invoiceValue = toNumber(pick(row, columnMap.invoiceValue));
    const integratedTax = toNumber(pick(row, columnMap.integratedTax));
    const centralTax = toNumber(pick(row, columnMap.centralTax));
    const stateTax = toNumber(pick(row, columnMap.stateTax));
    const gstin = String(pick(row, columnMap.gstin) || "").trim();
    const stateCode = gstin.slice(0, 2);
    const mappedState = gstStateMap[stateCode] || "";

    const supplierState = pick(row, columnMap.placeOfSupply);
    const slab = determineSlab(taxableValue, integratedTax, centralTax);

    const base = {
      "Sr no.": index + 1,
      Date: formatDate(invoiceDate),
      "Vch No": invoiceNumber,
      "VCH Type": "PURCHASE",
      "Reference No.": invoiceNumber,
      "Reference Date": formatDate(invoiceDate),
      "Supplier Name": pick(row, columnMap.tradeName),
      "GST Registration Type": pick(row, columnMap.invoiceType),
      "GSTIN/UIN": gstin,
      State: mappedState,
      "Supplier State": supplierState,
      "Supplier Amount": invoiceValue || taxableValue,
      "Supplier Dr/Cr": "CR",
    "Ledger Name": "",
      "Ledger Amount 5%": "",
      "Ledger amount cr/dr 5%": "",
      "Ledger Amount 12%": "",
      "Ledger amount Cr/Dr 12%": "",
      "Ledger Amount 18%": "",
      "Ledger amount cr/dr 18%": "",
      "Ledger Amount 28%": "",
      "Ledger amount cr/dr 28%": "",
      "IGST Rate 5%": "",
      "CGST Rate 5%": "",
      "SGST/UTGST Rate 5%": "",
      "IGST Rate 12%": "",
      "CGST Rate 12%": "",
      "SGST/UTGST Rate 12%": "",
      "IGST Rate 18%": "",
      "CGST Rate 18%": "",
      "SGST/UTGST Rate 18%": "",
      "IGST Rate 28%": "",
      "CGST Rate 28%": "",
      "SGST/UTGST Rate 28%": "",
      "GRO Amount": "",
      "Round Off Dr": "",
      "Round Off Cr": "",
      "Invoice Amount": "",
      "Change Mode": "Accounting Inovice",
    };

    if (slab) {
      const mapping = ledgerKeyMap[slab.slab];
      if (mapping) {
        base[mapping.ledgerAmount] = taxableValue;
        base[mapping.ledgerCrDr] = "DR";

        if (slab.mode === "IGST") {
          base[mapping.igst] = integratedTax;
        } else {
          base[mapping.cgst] = centralTax;
          base[mapping.sgst] = stateTax;
        }
      }
    }

    const parsedTaxes = taxKeys.reduce(
      (sum, key) => sum + toNumber(base[key]),
      0
    );
    const fallbackTaxes =
      parsedTaxes > 0 ? parsedTaxes : integratedTax + centralTax + stateTax;

    const ledgerAmount = taxableValue;
    const groAmount = parseFloat((ledgerAmount + fallbackTaxes).toFixed(2));
    const decimalPart = groAmount - Math.floor(groAmount);
    let roundOffDr = 0;
    let roundOffCr = 0;
    let invoiceAmount = groAmount;

    if (decimalPart > 0) {
      if (decimalPart >= 0.5) {
        roundOffCr = parseFloat((Math.ceil(groAmount) - groAmount).toFixed(2));
        invoiceAmount = groAmount + roundOffCr;
      } else {
        roundOffDr = parseFloat((groAmount - Math.floor(groAmount)).toFixed(2));
        invoiceAmount = groAmount - roundOffDr;
      }
    }

    base["GRO Amount"] = groAmount;
    base["Round Off Dr"] = roundOffDr || "";
    base["Round Off Cr"] = roundOffCr || "";
    base["Invoice Amount"] = invoiceAmount;
    base["Supplier Amount"] = invoiceAmount;

    return base;
  };

  const handleGenerate = () => {
    if (!sheetRows.length) {
      setStatus({ type: "error", message: "Upload a B2B sheet with data first." });
      return;
    }
    if (!company) {
      setStatus({ type: "error", message: "Company information missing." });
      return;
    }
    const rows = sheetRows.map((row, index) => buildRow(row, index));
    setGeneratedRows(rows);
    setStatus({
      type: "success",
      message: `Generated ${rows.length} rows. Download when ready.`,
    });
  };

  const handleDownloadGstr2BExcel = () => {
    if (!sheetRows.length) {
      setStatus({
        type: "error",
        message: "Upload a B2B sheet before downloading.",
      });
      return;
    }

    const worksheetRows = sheetRows.map((row) => {
      const entry = {};
      gstr2bHeaders.forEach(({ key, label }) => {
        entry[label] = row?.[key] ?? "";
      });
      return entry;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GSTR-2B");
    const filename = `${sanitizeFileName(
      company?.companyName || "company"
    )}-gstr2b.xlsx`;
    XLSX.writeFile(workbook, filename);
    setStatus({ type: "success", message: "GSTR-2B Excel downloaded." });
  };

  const ensureProcessedDoc = async () => {
    if (!importId) {
      setStatus({
        type: "error",
        message: "Import a sheet before downloading processed data.",
      });
      return null;
    }

    if (processedDoc) return processedDoc;

    try {
      const { data } = await fetchProcessedFile(importId);
      setProcessedDoc(data);
      initializeLedgerEdits(data?.processedRows || []);
      return data;
    } catch (error) {
      console.error("Failed to fetch processed file:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to fetch processed data. Please process the sheet first.",
      });
      return null;
    }
  };

  const guardDownloads = () => {
    if (!downloadsUnlocked) {
      setStatus({
        type: "error",
        message: "Please run Process Sheet first to unlock these downloads.",
      });
      return false;
    }
    return true;
  };

  const handleDownloadProcessedExcel = async () => {
    if (!guardDownloads()) return;
    const doc = await ensureProcessedDoc();
    if (!doc) return;

    const matchedRows = doc.processedRows || [];
    if (!matchedRows.length) {
      setStatus({
        type: "error",
        message: "No processed rows available. Process the sheet first.",
      });
      return;
    }

    const workbook = XLSX.utils.book_new();
    const processedSheet = XLSX.utils.json_to_sheet(applyLedgerEdits(matchedRows));
    XLSX.utils.book_append_sheet(workbook, processedSheet, "Processed");
    const filename = `${sanitizeFileName(
      doc.company || company?.companyName || "company"
    )}-tallymap.xlsx`;
    XLSX.writeFile(workbook, filename);
    setStatus({
      type: "success",
      message: "Processed Tally Map Excel downloaded.",
    });
  };

  const handleDownloadMismatchedExcel = async () => {
    if (!guardDownloads()) return;
    const doc = await ensureProcessedDoc();
    if (!doc) return;

    const mismatchedRows = doc.mismatchedRows || [];
    if (!mismatchedRows.length) {
      setStatus({
        type: "error",
        message: "No mismatched rows available.",
      });
      return;
    }

    const workbook = XLSX.utils.book_new();
    const sanitizedRows = mismatchedRows.map(
      ({
        "Ledger Amount 5%": _la5,
        "Ledger DR/CR 5%": _ldr5,
        "IGST Rate 5%": _ir5,
        "CGST Rate 5%": _cr5,
        "SGST/UTGST Rate 5%": _sr5,
        "Ledger Amount 12%": _la12,
        "Ledger DR/CR 12%": _ldr12,
        "IGST Rate 12%": _ir12,
        "CGST Rate 12%": _cr12,
        "SGST/UTGST Rate 12%": _sr12,
        "Ledger Amount 18%": _la18,
        "Ledger DR/CR 18%": _ldr18,
        "IGST Rate 18%": _ir18,
        "CGST Rate 18%": _cr18,
        "SGST/UTGST Rate 18%": _sr18,
        "Ledger Amount 28%": _la28,
        "Ledger DR/CR 28%": _ldr28,
        "IGST Rate 28%": _ir28,
        "CGST Rate 28%": _cr28,
        "SGST/UTGST Rate 28%": _sr28,
        ...rest
      }) => rest
    );
    const mismatchedSheet = XLSX.utils.json_to_sheet(sanitizedRows);
    XLSX.utils.book_append_sheet(workbook, mismatchedSheet, "Mismatched");
    const filename = `${sanitizeFileName(
      doc.company || company?.companyName || "company"
    )}-mismatched-data.xlsx`;
    XLSX.writeFile(workbook, filename);
    setStatus({
      type: "success",
      message: "Mismatched data Excel downloaded.",
    });
  };

  const handleProcessSheet = () => {
    if (!importId) {
      setStatus({
        type: "error",
        message: "Upload and import the sheet before processing.",
      });
      return;
    }
    setProcessing(true);
    processGstr2bImport(importId)
      .then(({ data }) => {
        setProcessedDoc(data.processed || null);
        initializeLedgerEdits(data.processed?.processedRows || []);
        setDownloadsUnlocked(true);
        setStatus({
          type: "success",
          message: `Processed ${data.processedCount || 0} rows successfully.`,
        });
      })
      .catch((error) => {
        console.error("Failed to process sheet:", error);
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            "Unable to process the sheet. Please try again.",
        });
      })
      .finally(() => setProcessing(false));
  };

  if (!company) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center p-6 space-y-3">
        <p className="text-lg text-slate-700">
          No company selected. Redirecting you to selector...
        </p>
        <button
          onClick={() => navigate("/company-selector")}
          className="px-4 py-2 rounded bg-indigo-600 text-white"
        >
          Go now
        </button>
      </main>
    );
  }

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-6">
        <BackButton label="Back to selector" fallback="/company-selector" />

        <motion.header
          className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur flex flex-col gap-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Step 2
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Prepare the purchase register
          </h1>
          <div className="text-sm text-slate-600 space-y-1">
            <p>Company: {company.companyName}</p>
            <p>GSTIN: {company.gstin || "—"}</p>
            <p>State: {company.state}</p>
            {loadingGST ? (
              <p className="text-xs text-amber-500 mt-1 flex items-center gap-2">
                <FiRefreshCw className="animate-spin" /> Loading GST state mapping...
              </p>
            ) : null}
          </div>
        </motion.header>

        {status.message ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm shadow ${
              status.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {status.message}
          </div>
        ) : null}

        <motion.section
          className="rounded-3xl border border-dashed border-amber-200 bg-white/90 p-6 shadow-lg backdrop-blur"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FiUploadCloud className="text-amber-500" />
            Upload GSTR-2B Excel
          </h2>
          <p className="text-sm text-slate-600">
            Accepted formats: .xlsx, .xls. We’ll guide you through the rest.
          </p>
          <label className="mt-4 flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 text-amber-700 transition hover:bg-amber-50">
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <span className="text-sm font-semibold flex items-center gap-2">
              <FiFilePlus />
              {uploading ? "Uploading..." : fileMeta.name || "Click to choose file"}
            </span>
            <span className="text-xs text-amber-500 mt-1">
              {fileMeta.name ? "Replace file" : "Max 10 MB"}
            </span>
          </label>
        </motion.section>

        {sheetRows.length ? (
          <motion.section
            className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                Step 3
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                B2B sheet ready
              </h3>
              <p className="text-sm text-slate-500">
                {sheetRows.length} rows imported from {fileMeta.name}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600"
            >
              <FiPlayCircle />
              Generate custom sheet
            </button>
          </motion.section>
        ) : null}

        {generatedRows.length ? (
          <motion.section
            className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadGstr2BExcel}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-slate-800"
              >
                <FiDownload />
                Download GSTR-2B Excel
              </button>
              <button
                onClick={handleDownloadProcessedExcel}
                disabled={!downloadsUnlocked}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload />
                Tally Map Excel
              </button>
              <button
                onClick={handleDownloadMismatchedExcel}
                disabled={!downloadsUnlocked}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiDownload />
                Mismatched Excel
              </button>
              <button
                onClick={handleProcessSheet}
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
              >
                <FiPlayCircle />
                {processing ? "Processing..." : "Process Sheet"}
              </button>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 flex flex-col gap-2">
              <span className="inline-flex items-center gap-2 font-semibold">
                <FiAlertCircle />
                Unlock downloads in two steps
              </span>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
                <li>Click “Process Sheet” once your file is uploaded.</li>
                <li>
                  When processing finishes, Tally Map & Mismatched buttons will
                  turn solid and become clickable.
                </li>
              </ol>
            </div>

            {processedDoc ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                Stored {processedDoc.processedRows?.length || 0} matched rows and{" "}
                {processedDoc.mismatchedRows?.length || 0} mismatched rows for{" "}
                {processedDoc.company || "company"}.
              </div>
            ) : null}
          </motion.section>
        ) : null}

        {hasProcessedRows ? (
          <motion.section
            className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-slate-900">
                  Review processed rows
                </h3>
                <p className="text-sm text-slate-600">
                  Click the Ledger Name column to pick from saved ledgers or type to
                  search. Filling these is optional and only affects your download.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadLedgerNames}
                  disabled={ledgerNamesLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiRefreshCw
                    className={ledgerNamesLoading ? "animate-spin" : ""}
                  />
                  {ledgerNamesLoading ? "Refreshing..." : "Refresh names"}
                </button>
                <button
                  type="button"
                  onClick={openAddLedgerModal}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600"
                >
                  <FiPlus />
                  New ledger name
                </button>
              </div>
            </div>
            {ledgerNames.length === 0 ? (
              <p className="text-xs text-rose-500">
                No saved ledger names yet. Add one to reuse it in every row.
              </p>
            ) : null}
            <datalist id={ledgerOptionListId}>
              {ledgerNames.map((ledger) => (
                <option key={ledger._id} value={ledger.name} />
              ))}
            </datalist>
            <div className="rounded-2xl border border-amber-100 overflow-auto max-h-[60vh]">
              <table className="min-w-full text-xs text-slate-700">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    {processedColumns.map((column) => (
                      <th
                        key={column}
                        className="px-2 py-2 text-left font-semibold border-b border-amber-100"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processedRows.map((row, rowIdx) => {
                    const rowKey = getRowKey(row, rowIdx);
                    const ledgerValue =
                      ledgerEdits[rowKey] ?? row?.["Ledger Name"] ?? "";
                    return (
                      <tr
                        key={rowKey}
                        className="border-b border-amber-50 last:border-0"
                      >
                        {processedColumns.map((column) => {
                          const cellKey = `${rowKey}-${column}`;
                          return (
                            <td
                              key={cellKey}
                              className="px-2 py-2 align-top text-[11px]"
                            >
                              {column === "Ledger Name" ? (
                                <input
                                  list={ledgerOptionListId}
                                  value={ledgerValue}
                                  onChange={(event) =>
                                    handleLedgerInputChange(
                                      rowKey,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Select or type ledger"
                                  className="w-56 rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-200"
                                />
                              ) : (
                                <span>{toDisplayValue(row?.[column])}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        ) : null}
      </section>
      {addLedgerModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Add ledger name
              </h3>
              <p className="text-sm text-slate-600">
                Newly added names appear instantly in the dropdown list.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleAddLedgerSubmit}>
              <input
                type="text"
                value={addLedgerModal.value}
                onChange={(event) =>
                  setAddLedgerModal((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Enter ledger name"
                autoFocus
                disabled={addLedgerModal.submitting}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddLedgerModal}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  disabled={addLedgerModal.submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLedgerModal.submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-60"
                >
                  {addLedgerModal.submitting ? "Adding..." : "Add ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </motion.main>
  );
};

export default CompanyProcessor;

