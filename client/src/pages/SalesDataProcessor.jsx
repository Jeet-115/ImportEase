import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiDownload,
  FiFilePlus,
  FiPlayCircle,
  FiRefreshCw,
  FiUploadCloud,
} from "react-icons/fi";
import BackButton from "../components/BackButton";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import LoadingScreen from "../components/ui/LoadingScreen.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useCompanyFromRoute } from "../hooks/useCompanyFromRoute";
import {
  downloadProcessedSalesExcel,
  processSalesDataImport,
  uploadSalesDataFile,
} from "../services/salesDataService";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";
import { companyHistorySalesDataPath } from "../utils/companyRoutes";
import { sanitizeFileName } from "../utils/fileUtils";

const getUploadErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.status === 404) {
    return "Sales upload API is unavailable. Please restart the app (npm run dev:electron) and try again.";
  }
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return "Your session expired or upload is not allowed. Sign in again and retry.";
  }
  if (error?.message) {
    return error.message;
  }
  return "Unable to upload the sales file. Please check the format and try again.";
};

const SalesDataProcessor = () => {
  const navigate = useNavigate();
  const { company, loading: companyLoading, error: companyError, hubPath } =
    useCompanyFromRoute();
  const { user, isPlanRestricted } = useAuth();
  const readOnly = !user?.isMaster && isPlanRestricted;
  const readOnlyMessage = readOnly
    ? getPlanRestrictionMessage(user?.planStatus)
    : "";

  const [fileMeta, setFileMeta] = useState({ name: "" });
  const [rowCount, setRowCount] = useState(0);
  const [importId, setImportId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [downloadsUnlocked, setDownloadsUnlocked] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!company && !companyLoading) {
      const timer = setTimeout(() => navigate(hubPath || "/"), 2000);
      return () => clearTimeout(timer);
    }
  }, [company, companyLoading, navigate, hubPath]);

  const buildCompanySnapshot = () => ({
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
  });

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !company) return;

    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      event.target.value = "";
      return;
    }

    setUploading(true);
    setStatus({ type: "", message: "" });
    setDownloadsUnlocked(false);
    setProcessedCount(0);

    uploadSalesDataFile(file, {
      companyId: company._id,
      companySnapshot: buildCompanySnapshot(),
    })
      .then(({ data }) => {
        setFileMeta({ name: file.name });
        setRowCount(data.rows?.length || data.metadata?.totalRecords || 0);
        setImportId(data._id || null);
        setStatus({
          type: "success",
          message: `File upload complete. ${data.rows?.length || 0} sales rows imported and stored.`,
        });
      })
      .catch((error) => {
        console.error(
          "Failed to upload sales data:",
          error?.response?.status,
          error?.response?.data || error,
        );
        setStatus({
          type: "error",
          message: getUploadErrorMessage(error),
        });
        setFileMeta({ name: "" });
        setRowCount(0);
        setImportId(null);
      })
      .finally(() => setUploading(false));
  };

  const handleProcess = () => {
    if (!importId || readOnly) return;
    setProcessing(true);
    setStatus({ type: "", message: "" });

    processSalesDataImport(importId)
      .then(({ data }) => {
        const count = data?.processedCount || data?.processed?.processedRows?.length || 0;
        setProcessedCount(count);
        setDownloadsUnlocked(true);
        setStatus({
          type: "success",
          message: `Processing complete. ${count} rows mapped to the Tally sales format.`,
        });
      })
      .catch((error) => {
        console.error("Failed to process sales data:", error);
        setStatus({
          type: "error",
          message:
            error?.response?.data?.message ||
            "Unable to process the sales file. Please try again.",
        });
      })
      .finally(() => setProcessing(false));
  };

  const handleDownload = async () => {
    if (!importId || !downloadsUnlocked) return;
    try {
      const base = sanitizeFileName(company?.companyName || "SalesData");
      await downloadProcessedSalesExcel(importId, `${base}-SalesProcessed.xlsx`);
      setStatus({
        type: "success",
        message: "Processed sales Excel downloaded.",
      });
    } catch (error) {
      console.error("Failed to download processed sales Excel:", error);
      setStatus({
        type: "error",
        message: "Unable to download the processed Excel file.",
      });
    }
  };

  if (companyLoading) {
    return <LoadingScreen message="Loading client…" />;
  }

  if (!company) {
    return (
      <main className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg text-slate-700">
          {companyError || "No client selected."}
        </p>
        <button type="button" onClick={() => navigate("/")} className="ie-btn-primary">
          Back to clients
        </button>
      </main>
    );
  }

  if (readOnly) {
    return (
      <motion.main className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <BackButton label="Back to client" fallback={hubPath} />
        <section className="ie-card space-y-4 p-6">
          <h1 className="text-2xl font-bold text-slate-900">Process sales data</h1>
          <PlanRestrictionBanner />
          <p className="text-sm text-slate-600">{readOnlyMessage}</p>
          <button
            type="button"
            onClick={() =>
              navigate(companyHistorySalesDataPath(company._id), {
                state: { company },
              })
            }
            className="ie-btn-primary"
          >
            Open sales data history
          </button>
        </section>
      </motion.main>
    );
  }

  return (
    <motion.main
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <BackButton label="Back to client" fallback={hubPath} />

      <motion.header
        className="ie-hero relative"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="ie-hero-grid" aria-hidden />
        <div className="relative z-[1] space-y-3">
          <p className="ie-eyebrow">Sales data</p>
          <h1 className="ie-page-title">Process sales data</h1>
          <div className="text-sm text-slate-600 space-y-1">
            <p>Client: {company.companyName}</p>
            <p>GSTIN: {company.gstin || "—"}</p>
          </div>
          <p className="ie-page-desc !max-w-2xl">
            Upload a sales report Excel or CSV. ImportEase finds the header row
            automatically, stores the original data, then maps each row to the
            Tally-ready sales format.
          </p>
        </div>
      </motion.header>

      <PlanRestrictionBanner />

      {status.message ? (
        <div
          className={
            status.type === "error" ? "ie-alert-error" : "ie-alert-success"
          }
        >
          {status.message}
        </div>
      ) : null}

      <motion.section
        className="ie-card border-dashed border-teal-200/80 p-6 space-y-3"
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <FiUploadCloud className="text-teal-600" />
          Step A – Upload sales report
        </h2>
        <p className="text-sm text-slate-600">
          Accepted columns: Invoice, Posting Date, Customers Name, Customers
          GSTIN, Net Total, Output Tax CGST/SGST/IGST, Grand Total, and related
          fields. Headers can start on any row.
        </p>
        <ul className="list-disc list-inside text-xs text-slate-500 space-y-1">
          <li>Accepted formats: .xlsx, .xls, .csv</li>
          <li>Upload again to replace the current file before processing</li>
        </ul>
        <label className="mt-2 flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-teal-50/40 text-teal-700 transition hover:bg-teal-50">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-sm font-semibold flex items-center gap-2">
            <FiFilePlus />
            {uploading ? "Uploading…" : fileMeta.name || "Click to choose file"}
          </span>
          <span className="text-xs text-slate-500 mt-1">
            {fileMeta.name ? "Replace file" : "Excel or CSV"}
          </span>
        </label>
      </motion.section>

      {importId ? (
        <motion.section
          className="ie-card p-6 space-y-4"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div>
            <p className="ie-eyebrow">Step B</p>
            <h3 className="text-xl font-semibold text-slate-900">
              File upload complete
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {rowCount} rows imported from {fileMeta.name}. Original data is
              saved in JSON. Click process to build the output format.
            </p>
          </div>
          <button
            type="button"
            onClick={handleProcess}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-teal-700 disabled:opacity-60"
          >
            {processing ? (
              <FiRefreshCw className="animate-spin" />
            ) : (
              <FiPlayCircle />
            )}
            {processing ? "Processing…" : "Process sales data"}
          </button>
        </motion.section>
      ) : null}

      {downloadsUnlocked ? (
        <motion.section
          className="ie-card p-6 space-y-4"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div>
            <p className="ie-eyebrow">Step C</p>
            <h3 className="text-xl font-semibold text-slate-900">
              Download processed Excel
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {processedCount} rows mapped with ledger rules, round-off DR/CR,
              and Tally columns.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-teal-700"
            >
              <FiDownload />
              Download processed Excel
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(companyHistorySalesDataPath(company._id), {
                  state: { company },
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View history
            </button>
          </div>
        </motion.section>
      ) : null}
    </motion.main>
  );
};

export default SalesDataProcessor;
