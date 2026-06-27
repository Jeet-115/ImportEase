import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import {
  FiDownload,
  FiEye,
  FiFileText,
  FiInfo,
  FiTrash2,
} from "react-icons/fi";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import BackButton from "../components/BackButton";
import ConfirmDialog from "../components/ConfirmDialog";
import ExcelPreviewModal from "../components/ExcelPreviewModal.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";
import { companyHubPath } from "../utils/companyRoutes";
import { useCompanyFromRoute } from "../hooks/useCompanyFromRoute";
import LoadingScreen from "../components/ui/LoadingScreen.jsx";
import {
  deleteSalesImport,
  downloadProcessedSalesExcel,
  fetchProcessedSalesData,
  fetchSalesImportById,
  fetchSalesImportsByCompany,
} from "../services/salesDataService";
import { SALES_OUTPUT_COLUMNS } from "../utils/salesDataHeaders";
import { sanitizeFileName } from "../utils/fileUtils";

const SOURCE_COLUMNS = [
  { key: "invoice", label: "Invoice" },
  { key: "postingDate", label: "Posting Date" },
  { key: "customersName", label: "Customers Name" },
  { key: "customersGstin", label: "Customers GSTIN" },
  { key: "netTotal", label: "Net Total" },
  { key: "outputTaxCgst", label: "Output Tax CGST" },
  { key: "outputTaxSgst", label: "Output Tax SGST" },
  { key: "outputTaxIgst", label: "Output Tax IGST" },
  { key: "grandTotal", label: "Grand Total" },
];

const SalesDataHistory = () => {
  const { companyId } = useParams();
  const { company: routeCompany, loading: companyLoading, hubPath } =
    useCompanyFromRoute();
  const { user, isPlanRestricted } = useAuth();
  const readOnly = !user?.isMaster && isPlanRestricted;
  const readOnlyMessage = readOnly
    ? getPlanRestrictionMessage(user?.planStatus)
    : "";

  const company = routeCompany;
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importCache, setImportCache] = useState({});
  const [processedCache, setProcessedCache] = useState({});

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    fetchSalesImportsByCompany(companyId)
      .then(({ data }) => setImports(data || []))
      .catch(() => setPageError("Unable to load sales data history."))
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const ensureImportDoc = useCallback(
    async (importId) => {
      if (importCache[importId]) return importCache[importId];
      const { data } = await fetchSalesImportById(importId);
      setImportCache((prev) => ({ ...prev, [importId]: data }));
      return data;
    },
    [importCache],
  );

  const ensureProcessedDoc = useCallback(
    async (importId) => {
      if (processedCache[importId]) return processedCache[importId];
      try {
        const { data } = await fetchProcessedSalesData(importId);
        setProcessedCache((prev) => ({ ...prev, [importId]: data }));
        return data;
      } catch (error) {
        if (error.response?.status === 404) {
          setStatus({
            type: "error",
            message: "No processed data found. Process the file first.",
          });
        }
        return null;
      }
    },
    [processedCache],
  );

  const openSourcePreview = async (importId) => {
    try {
      const doc = await ensureImportDoc(importId);
      const rows = (doc?.rows || []).map((row) => {
        const mapped = {};
        SOURCE_COLUMNS.forEach(({ key, label }) => {
          mapped[label] = row[key] ?? "";
        });
        return mapped;
      });
      setPreview({
        open: true,
        title: `Original sales data – ${doc?.sourceFileName || importId}`,
        columns: SOURCE_COLUMNS.map((col) => col.label),
        rows,
      });
    } catch (error) {
      console.error("Failed to preview source sales data:", error);
      setStatus({ type: "error", message: "Unable to preview original data." });
    }
  };

  const openProcessedPreview = async (importId) => {
    try {
      const doc = await ensureProcessedDoc(importId);
      if (!doc?.processedRows?.length) return;
      setPreview({
        open: true,
        title: `Processed sales data – ${importId}`,
        columns: SALES_OUTPUT_COLUMNS,
        rows: doc.processedRows,
      });
    } catch (error) {
      console.error("Failed to preview processed sales data:", error);
      setStatus({ type: "error", message: "Unable to preview processed data." });
    }
  };

  const handleDownloadProcessed = async (importId, sourceFileName) => {
    try {
      const doc = await ensureProcessedDoc(importId);
      if (!doc?.processedRows?.length) return;
      const base = sanitizeFileName(company?.companyName || "SalesData");
      const suffix = sourceFileName
        ? `-${sanitizeFileName(sourceFileName.replace(/\.[^.]+$/, ""))}`
        : "";
      await downloadProcessedSalesExcel(
        importId,
        `${base}${suffix}-SalesProcessed.xlsx`,
      );
    } catch (error) {
      console.error("Failed to download processed sales Excel:", error);
      setStatus({
        type: "error",
        message: "Unable to download processed Excel.",
      });
    }
  };

  const downloadSourceExcel = async (importId) => {
    try {
      const doc = await ensureImportDoc(importId);
      const rows = (doc?.rows || []).map((row) => {
        const mapped = {};
        SOURCE_COLUMNS.forEach(({ key, label }) => {
          mapped[label] = row[key] ?? "";
        });
        return mapped;
      });
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Sales Source");
      const base = sanitizeFileName(company?.companyName || "SalesData");
      XLSX.writeFile(workbook, `${base}-SalesSource.xlsx`);
    } catch (error) {
      console.error("Failed to download source excel:", error);
      setStatus({ type: "error", message: "Unable to download original data." });
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      setConfirmDeleteId(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteSalesImport(confirmDeleteId);
      setImports((prev) => prev.filter((item) => item._id !== confirmDeleteId));
      setStatus({ type: "success", message: "Sales import deleted." });
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Failed to delete sales import:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to delete import. Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (companyLoading) {
    return <LoadingScreen message="Loading client…" />;
  }

  if (loading) {
    return <LoadingScreen message="Loading sales data history…" />;
  }

  return (
    <motion.main className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <section className="space-y-5">
        {pageError ? <div className="ie-alert-error">{pageError}</div> : null}
        {status.message ? (
          <div
            className={
              status.type === "error" ? "ie-alert-error" : "ie-alert-success"
            }
          >
            {status.message}
          </div>
        ) : null}

        <BackButton
          label="Back to client"
          fallback={hubPath || (companyId ? companyHubPath(companyId) : "/")}
        />

        <motion.header
          className="ie-card p-6 sm:p-8 space-y-3"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="ie-eyebrow">Sales data history</p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Client"}
          </h1>
          <div className="flex flex-wrap gap-3 text-xs text-teal-700">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1">
              <FiInfo />
              Re-download processed sales Excel or review original uploads.
            </span>
          </div>
        </motion.header>

        <PlanRestrictionBanner />

        <motion.section
          className="ie-card p-4 sm:p-6 space-y-4"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FiFileText className="text-teal-600" />
            Sales data imports
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-600">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-2 py-2">Imported at</th>
                  <th className="px-2 py-2">Source file</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Rows</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {imports.length ? (
                  imports.map((imp) => (
                    <tr key={imp._id} className="border-t border-slate-100">
                      <td className="px-2 py-3">
                        {new Date(imp.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-3">{imp.sourceFileName || "—"}</td>
                      <td className="px-2 py-3 uppercase">
                        {imp.sourceType || "—"}
                      </td>
                      <td className="px-2 py-3">
                        {imp.rows?.length || imp.metadata?.totalRecords || 0}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => downloadSourceExcel(imp._id)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                          >
                            <FiDownload />
                            Source Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => openSourcePreview(imp._id)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                          >
                            <FiEye />
                            View source
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadProcessed(imp._id, imp.sourceFileName)
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <FiDownload />
                            Processed Excel
                          </button>
                          <button
                            type="button"
                            onClick={() => openProcessedPreview(imp._id)}
                            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <FiEye />
                            View processed
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(imp._id)}
                            disabled={readOnly}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            title={readOnly ? readOnlyMessage : "Delete import"}
                          >
                            <FiTrash2 />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-2 py-8 text-center text-slate-500">
                      No sales data imports yet for this client.
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
        onClose={() =>
          setPreview({ open: false, title: "", columns: [], rows: [] })
        }
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete sales import?"
        message="This removes the original and processed JSON for this upload."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </motion.main>
  );
};

export default SalesDataHistory;
