import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiUpload, FiCheck, FiX } from "react-icons/fi";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { importPurchaseGst2B } from "../services/accountingService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const PurchaseGst2B = () => {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (companyId) {
      loadCompany();
    }
  }, [companyId]);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const loadCompany = async () => {
    try {
      const { data } = await fetchCompanyMasterById(companyId);
      setCompany(data);
    } catch (error) {
      console.error("Failed to load company:", error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatus({ type: "error", message: "Please select a file to upload" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data } = await importPurchaseGst2B(companyId, formData);
      setResult(data);
      setStatus({
        type: "success",
        message: "GST-2B file imported successfully!",
      });
      setFile(null);
    } catch (error) {
      console.error("Failed to import GST-2B:", error);
      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to import GST-2B file. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton
          label="Back to Purchase Home"
          fallback={`/accounting/${companyId}/purchase`}
        />
        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
            GST-2B Import
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "GST-2B Import"}
          </h1>
          <p className="text-base text-slate-600">
            Import purchase bills from GST-2B data
          </p>
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

        {result ? (
          <motion.div
            className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <h2 className="text-xl font-bold text-emerald-900 mb-4">
              Import Successful!
            </h2>
            <div className="space-y-2 text-sm">
              {result.matched && (
                <div className="flex items-center gap-2 text-emerald-700">
                  <FiCheck className="text-emerald-600" />
                  <span>
                    {result.matched.length} parties matched by GSTIN
                  </span>
                </div>
              )}
              {result.duplicates && result.duplicates.length > 0 && (
                <div className="flex items-center gap-2 text-amber-700">
                  <FiX className="text-amber-600" />
                  <span>
                    {result.duplicates.length} duplicate invoices found
                  </span>
                </div>
              )}
              {result.itcEligible !== undefined && (
                <div className="flex items-center gap-2 text-slate-700">
                  <span>
                    ITC Eligible: ₹{Number(result.itcEligible || 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
              }}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Import Another File
            </button>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleUpload}
            className="rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <FiUpload className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Upload GST-2B File
                </h2>
                <p className="text-xs text-slate-500">
                  Select Excel file containing GST-2B data
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  required
                />
                {file && (
                  <p className="mt-1 text-xs text-slate-600">
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Auto-match party by GSTIN</li>
                  <li>Validate duplicate invoices</li>
                  <li>Show ITC eligibility</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFile(null)}
                className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !file}
                className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <FiRefreshCw className="inline animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FiUpload className="inline mr-2" />
                    Upload & Import
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </section>
    </motion.main>
  );
};

export default PurchaseGst2B;
