import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiDownload,
  FiEye,
  FiFileText,
  FiInfo,
  FiLayers,
} from "react-icons/fi";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import BackButton from "../components/BackButton";
import ExcelPreviewModal from "../components/ExcelPreviewModal.jsx";
import { fetchCompanyMasterById } from "../services/companymasterservices";
import {
  fetchImportById,
  fetchImportsByCompany,
  fetchProcessedFile,
} from "../services/gstr2bservice";
import { gstr2bHeaders } from "../utils/gstr2bHeaders";
import { sanitizeFileName } from "../utils/fileUtils";

const B2BCompanyHistory = () => {
  const { companyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [company, setCompany] = useState(location.state?.company || null);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [preview, setPreview] = useState({
    open: false,
    title: "",
    columns: [],
    rows: [],
  });
  const [importCache, setImportCache] = useState({});
  const [processedCache, setProcessedCache] = useState({});

  useEffect(() => {
    if (!company) {
      fetchCompanyMasterById(companyId)
        .then(({ data }) => setCompany(data))
        .catch((err) => {
          console.error("Failed to load company:", err);
          setPageError("Unable to load company details.");
        });
    }
  }, [company, companyId]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetchImportsByCompany(companyId)
      .then(({ data }) => setImports(data || []))
      .catch((err) => {
        console.error("Failed to load imports:", err);
        setPageError("Unable to load import history.");
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const ensureImportDoc = async (importId) => {
    if (importCache[importId]) return importCache[importId];
    const { data } = await fetchImportById(importId);
    setImportCache((prev) => ({ ...prev, [importId]: data }));
    return data;
  };

  const ensureProcessedDoc = async (importId) => {
    if (processedCache[importId]) return processedCache[importId];
    try {
      const { data } = await fetchProcessedFile(importId);
      setProcessedCache((prev) => ({ ...prev, [importId]: data }));
      return data;
    } catch (error) {
      if (error.response?.status === 404) {
        setStatus({
          type: "error",
          message: "No processed data found. Please process this sheet first.",
        });
        return null;
      }
      throw error;
    }
  };

  const downloadRawExcel = async (importId) => {
    try {
      const doc = await ensureImportDoc(importId);
      const rows = doc.rows || [];
      if (!rows.length) {
        setStatus({ type: "error", message: "No rows available in this import." });
        return;
      }
      const worksheetRows = rows.map((row) => {
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
        doc.companySnapshot?.companyName || company?.companyName || "company"
      )}-gstr2b.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Failed to download raw excel:", err);
      setStatus({ type: "error", message: "Unable to download raw excel." });
    }
  };

  const openRawPreview = async (importId) => {
    try {
      const doc = await ensureImportDoc(importId);
      const rows = doc.rows || [];
      const columns = gstr2bHeaders.map(({ label }) => label);
      const formattedRows = rows.map((row) => {
        const entry = {};
        gstr2bHeaders.forEach(({ key, label }) => {
          entry[label] = row?.[key] ?? "";
        });
        return entry;
      });
      setPreview({
        open: true,
        title: "GSTR-2B Data",
        columns,
        rows: formattedRows,
      });
    } catch (err) {
      console.error("Failed to preview raw data:", err);
      setStatus({ type: "error", message: "Unable to preview raw data." });
    }
  };

  const downloadProcessedExcel = async (importId, mismatched = false) => {
    try {
      const doc = await ensureProcessedDoc(importId);
      if (!doc) {
        setStatus({
          type: "error",
          message: "No processed data found for this import.",
        });
        return;
      }
      const rows = mismatched ? doc.mismatchedRows : doc.processedRows;
      if (!rows?.length) {
        setStatus({
          type: "error",
          message: mismatched
            ? "No mismatched rows available."
            : "No processed rows available.",
        });
        return;
      }

      const workbook = XLSX.utils.book_new();
      let exportRows = rows;
      if (mismatched) {
        exportRows = rows.map(
          ({
            "Ledger Name 5%": _ln5,
            "Ledger Amount 5%": _la5,
            "Ledger DR/CR 5%": _ldr5,
            "IGST Rate 5%": _ir5,
            "CGST Rate 5%": _cr5,
            "SGST/UTGST Rate 5%": _sr5,
            "Ledger Name 12%": _ln12,
            "Ledger Amount 12%": _la12,
            "Ledger DR/CR 12%": _ldr12,
            "IGST Rate 12%": _ir12,
            "CGST Rate 12%": _cr12,
            "SGST/UTGST Rate 12%": _sr12,
            "Ledger Name 18%": _ln18,
            "Ledger Amount 18%": _la18,
            "Ledger DR/CR 18%": _ldr18,
            "IGST Rate 18%": _ir18,
            "CGST Rate 18%": _cr18,
            "SGST/UTGST Rate 18%": _sr18,
            "Ledger Name 28%": _ln28,
            "Ledger Amount 28%": _la28,
            "Ledger DR/CR 28%": _ldr28,
            "IGST Rate 28%": _ir28,
            "CGST Rate 28%": _cr28,
            "SGST/UTGST Rate 28%": _sr28,
            ...rest
          }) => rest
        );
      }
      const sheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        mismatched ? "Mismatched" : "Processed"
      );
      const filename = `${sanitizeFileName(
        doc.company || company?.companyName || "company"
      )}-${mismatched ? "mismatched-data" : "tallymap"}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error("Failed to download processed excel:", err);
      setStatus({ type: "error", message: "Unable to download processed data." });
    }
  };

  const openProcessedPreview = async (importId, mismatched = false) => {
    try {
      const doc = await ensureProcessedDoc(importId);
      if (!doc) return;
      const rows = mismatched ? doc.mismatchedRows : doc.processedRows;
      if (!rows?.length) {
        setStatus({
          type: "error",
          message: mismatched
            ? "No mismatched rows available."
            : "No processed rows available.",
        });
        return;
      }
      const columnBlacklist = ["5%", "12%", "18%", "28%"];
      let columns = Object.keys(rows[0] || {});
      let displayRows = rows.slice(0, 100); // limit for modal

      if (mismatched) {
        columns = columns.filter(
          (col) => !columnBlacklist.some((pattern) => col.includes(pattern))
        );
        displayRows = displayRows.map((row) =>
          columns.reduce((acc, col) => {
            acc[col] = row?.[col];
            return acc;
          }, {})
        );
      }

      setPreview({
        open: true,
        title: mismatched ? "Mismatched Rows Preview" : "Processed Rows Preview",
        columns,
        rows: displayRows,
      });
    } catch (err) {
      console.error("Failed to preview processed data:", err);
      setStatus({ type: "error", message: "Unable to preview processed data." });
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-white text-amber-800">
        Loading history...
      </main>
    );
  }

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        {pageError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow">
            {pageError}
          </div>
        ) : null}

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

        <BackButton label="Back to history" fallback="/b2b-history" />

        <motion.header
          className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Company
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Company"}
          </h1>
          <div className="text-sm text-slate-600 space-y-1">
            <p>{company?.address}</p>
            <p>
              {company?.state}, {company?.country} - {company?.pincode}
            </p>
            <p>GSTIN: {company?.gstin || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-amber-700">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1">
              <FiInfo /> Download Excel or preview data anytime
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-rose-600">
              <FiLayers /> Mismatched preview hides tax-slab columns
            </span>
          </div>
        </motion.header>

        <motion.section
          className="rounded-3xl border border-amber-100 bg-white/95 p-4 sm:p-6 shadow-lg backdrop-blur space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FiFileText className="text-amber-500" />
            GSTR-2B Imports
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-600">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2">Imported At</th>
                  <th className="px-2 py-2">Source File</th>
                  <th className="px-2 py-2">Rows</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {imports.length ? (
                  imports.map((imp) => (
                    <tr
                      key={imp._id}
                      className="border-t border-amber-50 text-sm"
                    >
                      <td className="px-2 py-3">
                        {new Date(imp.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-3">{imp.sourceFileName || "—"}</td>
                      <td className="px-2 py-3">
                        {imp.rows?.length || imp.metadata?.totalRecords || 0}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => downloadRawExcel(imp._id)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <FiDownload /> Raw
                          </button>
                          <button
                            onClick={() => openRawPreview(imp._id)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <FiEye /> Raw
                          </button>
                          <button
                            onClick={() => downloadProcessedExcel(imp._id, false)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <FiDownload /> Processed
                          </button>
                          <button
                            onClick={() => downloadProcessedExcel(imp._id, true)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <FiDownload /> Mismatched
                          </button>
                          <button
                            onClick={() => openProcessedPreview(imp._id, false)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <FiEye /> Processed
                          </button>
                          <button
                            onClick={() => openProcessedPreview(imp._id, true)}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                          >
                            <FiEye /> Mismatched
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-6 text-center text-slate-500"
                    >
                      No imports found for this company.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </section>

      <ExcelPreviewModal
        open={preview.open}
        title={preview.title}
        columns={preview.columns}
        rows={preview.rows}
        onClose={() => setPreview((prev) => ({ ...prev, open: false }))}
      />
    </motion.main>
  );
};

export default B2BCompanyHistory;

