import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiBriefcase, FiFileText, FiDownload, FiArrowRight, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { fetchCompanyMasters } from "../services/companymasterservices";
import { fetchImportsByCompany as fetchGstr2BImports } from "../services/gstr2bservice";
import { fetchImportsByCompany as fetchGstr2AImports } from "../services/gstr2aservice";
import { compareGstr2BWithGstr2A, compareGstr2BWithPurchaseReg } from "../services/comparisonservice";

const Comparisons = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("selectCompany"); // selectCompany, selectType, flowA, flowB
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  // Flow A (GSTR-2B ↔ GSTR-2A)
  const [gstr2bImports, setGstr2bImports] = useState([]);
  const [gstr2aImports, setGstr2aImports] = useState([]);
  const [selectedGstr2bId, setSelectedGstr2bId] = useState("");
  const [selectedGstr2aId, setSelectedGstr2aId] = useState("");
  const [comparing, setComparing] = useState(false);

  // Flow B (GSTR-2B ↔ Purchase Register)
  const [purchaseRegFile, setPurchaseRegFile] = useState(null);
  const [selectedGstr2bIdForPR, setSelectedGstr2bIdForPR] = useState("");

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { data } = await fetchCompanyMasters();
        setCompanies(data || []);
      } catch (err) {
        console.error("Failed to load company masters:", err);
        setError("Unable to load companies. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => setStatus({ type: "", message: "" }), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    if (selectedCompany && step === "flowA") {
      loadImports();
    }
  }, [selectedCompany, step]);

  const loadImports = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const [gstr2bData, gstr2aData] = await Promise.all([
        fetchGstr2BImports(selectedCompany._id),
        fetchGstr2AImports(selectedCompany._id),
      ]);
      setGstr2bImports(gstr2bData.data || []);
      setGstr2aImports(gstr2aData.data || []);
    } catch (err) {
      console.error("Failed to load imports:", err);
      setStatus({
        type: "error",
        message: "Unable to load processed files. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    setStep("selectType");
  };

  const handleBackToSelect = () => {
    setSelectedCompany(null);
    setStep("selectCompany");
    setGstr2bImports([]);
    setGstr2aImports([]);
    setSelectedGstr2bId("");
    setSelectedGstr2aId("");
    setSelectedGstr2bIdForPR("");
    setPurchaseRegFile(null);
  };

  const handleSelectType = (type) => {
    if (type === "gstr2a") {
      setStep("flowA");
      loadImports();
    } else if (type === "purchaseReg") {
      setStep("flowB");
      loadGstr2BImportsForPR();
    }
  };

  const loadGstr2BImportsForPR = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const { data } = await fetchGstr2BImports(selectedCompany._id);
      setGstr2bImports(data || []);
    } catch (err) {
      console.error("Failed to load GSTR-2B imports:", err);
      setStatus({
        type: "error",
        message: "Unable to load GSTR-2B files. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompareGstr2A = async () => {
    if (!selectedGstr2bId || !selectedGstr2aId) {
      setStatus({
        type: "error",
        message: "Please select both GSTR-2B and GSTR-2A files.",
      });
      return;
    }

    setComparing(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await compareGstr2BWithGstr2A(selectedGstr2bId, {
        gstr2aId: selectedGstr2aId,
      });

      // Download the Excel file
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const gstr2bFile = gstr2bImports.find((imp) => imp._id === selectedGstr2bId);
      const gstr2aFile = gstr2aImports.find((imp) => imp._id === selectedGstr2aId);
      const filename = `GSTR-2B-vs-GSTR-2A-${gstr2bFile?.sheetName || "comparison"}-${new Date().toISOString().split("T")[0]}.xlsx`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatus({
        type: "success",
        message: "Comparison completed successfully. Excel file downloaded.",
      });
    } catch (err) {
      console.error("Comparison failed:", err);
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to perform comparison. Please try again.",
      });
    } finally {
      setComparing(false);
    }
  };

  const handleComparePurchaseReg = async () => {
    if (!selectedGstr2bIdForPR || !purchaseRegFile) {
      setStatus({
        type: "error",
        message: "Please select a GSTR-2B file and upload a Purchase Register Excel file.",
      });
      return;
    }

    setComparing(true);
    setStatus({ type: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("file", purchaseRegFile);

      const response = await compareGstr2BWithPurchaseReg(selectedGstr2bIdForPR, formData);

      // Download the Excel file
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const gstr2bFile = gstr2bImports.find((imp) => imp._id === selectedGstr2bIdForPR);
      const filename = `GSTR-2B-vs-Purchase-Reg-${gstr2bFile?.sheetName || "comparison"}-${new Date().toISOString().split("T")[0]}.xlsx`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatus({
        type: "success",
        message: "Comparison completed successfully. Excel file downloaded.",
      });
    } catch (err) {
      console.error("Comparison failed:", err);
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to perform comparison. Please try again.",
      });
    } finally {
      setComparing(false);
    }
  };

  const handlePurchaseRegFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPurchaseRegFile(file);
    }
  };

  if (loading && step === "selectCompany") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-white text-amber-800">
        Loading companies...
      </main>
    );
  }

  if (error && step === "selectCompany") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-white text-rose-600">
        {error}
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
        <BackButton label="Back to dashboard" />

        {step === "selectCompany" && (
          <>
            <motion.header
              className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                Step 1
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                Step 1: Choose the company
              </h1>
              <p className="text-base text-slate-600">
                Select the company whose processed files you want to compare.
              </p>
            </motion.header>

            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { staggerChildren: 0.05 },
                },
              }}
            >
              {companies.map((company) => (
                <motion.button
                  key={company._id}
                  onClick={() => handleSelectCompany(company)}
                  className="rounded-2xl border border-amber-100 bg-white/90 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                >
                  <div className="flex items-center gap-3 text-amber-600">
                    <FiBriefcase />
                    <span className="text-sm font-semibold uppercase tracking-wide text-amber-500">
                      Company Name
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    {company.companyName}
                  </h2>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    {company.address ? <p>{company.address}</p> : null}
                    <p>
                      {company.state}, {company.country} - {company.pincode}
                    </p>
                    <p>GSTIN: {company.gstin || "—"}</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>

            {!companies.length && (
              <p className="text-center text-slate-500">
                No companies found. Create one first.
              </p>
            )}
          </>
        )}

        {step === "selectType" && (
          <>
            <motion.header
              className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                    Step 2
                  </p>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Step 2: Choose comparison type
                  </h1>
                  <p className="text-base text-slate-600 mt-2">
                    Selected company: <strong>{selectedCompany?.companyName}</strong>
                  </p>
                </div>
                <button
                  onClick={handleBackToSelect}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </motion.header>

            <div className="grid gap-6 sm:grid-cols-2">
              <motion.button
                onClick={() => handleSelectType("gstr2a")}
                className="rounded-2xl border border-amber-100 bg-white/90 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3 text-amber-600 mb-3">
                  <FiFileText className="w-6 h-6" />
                  <span className="text-lg font-semibold text-slate-900">
                    GSTR-2B ↔ GSTR-2A
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Compare GSTR-2B invoices against GSTR-2A and keep only invoices not appearing in GSTR-2A.
                </p>
                <div className="mt-4 flex items-center text-amber-600 text-sm font-semibold">
                  Select <FiArrowRight className="ml-1" />
                </div>
              </motion.button>

              <motion.button
                onClick={() => handleSelectType("purchaseReg")}
                className="rounded-2xl border border-amber-100 bg-white/90 p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 text-amber-600 mb-3">
                  <FiFileText className="w-6 h-6" />
                  <span className="text-lg font-semibold text-slate-900">
                    GSTR-2B ↔ Purchase Register
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Compare GSTR-2B invoices with a Purchase Register Excel and highlight matches/mismatches.
                </p>
                <div className="mt-4 flex items-center text-amber-600 text-sm font-semibold">
                  Select <FiArrowRight className="ml-1" />
                </div>
              </motion.button>
            </div>
          </>
        )}

        {step === "flowA" && (
          <>
            <motion.header
              className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                    GSTR-2B ↔ GSTR-2A Comparison
                  </p>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Select files to compare
                  </h1>
                  <p className="text-base text-slate-600 mt-2">
                    Company: <strong>{selectedCompany?.companyName}</strong>
                  </p>
                </div>
                <button
                  onClick={handleBackToSelect}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </motion.header>

            {status.message && (
              <div
                className={`rounded-lg p-4 ${
                  status.type === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-green-50 text-green-800 border border-green-200"
                }`}
              >
                {status.message}
              </div>
            )}

            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-100 bg-white/90 p-6 shadow-sm">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Select GSTR-2B File
                </label>
                <select
                  value={selectedGstr2bId}
                  onChange={(e) => setSelectedGstr2bId(e.target.value)}
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  disabled={loading || comparing}
                >
                  <option value="">-- Select GSTR-2B file --</option>
                  {gstr2bImports.map((imp) => (
                    <option key={imp._id} value={imp._id}>
                      {imp.sheetName || "GSTR-2B"} - {new Date(imp.uploadedAt || imp.createdAt || Date.now()).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {gstr2bImports.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">
                    No GSTR-2B files found for this company.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-amber-100 bg-white/90 p-6 shadow-sm">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Select GSTR-2A File
                </label>
                <select
                  value={selectedGstr2aId}
                  onChange={(e) => setSelectedGstr2aId(e.target.value)}
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  disabled={loading || comparing}
                >
                  <option value="">-- Select GSTR-2A file --</option>
                  {gstr2aImports.map((imp) => (
                    <option key={imp._id} value={imp._id}>
                      {imp.sheetName || "GSTR-2A"} - {new Date(imp.uploadedAt || imp.createdAt || Date.now()).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {gstr2aImports.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">
                    No GSTR-2A files found for this company.
                  </p>
                )}
              </div>

              <button
                onClick={handleCompareGstr2A}
                disabled={!selectedGstr2bId || !selectedGstr2aId || comparing || loading}
                className="w-full rounded-lg bg-amber-600 px-6 py-3 text-white font-semibold shadow-sm transition hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {comparing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <FiDownload className="w-5 h-5" />
                    Compare & Download
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {step === "flowB" && (
          <>
            <motion.header
              className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
                    GSTR-2B ↔ Purchase Register Comparison
                  </p>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Select files to compare
                  </h1>
                  <p className="text-base text-slate-600 mt-2">
                    Company: <strong>{selectedCompany?.companyName}</strong>
                  </p>
                </div>
                <button
                  onClick={handleBackToSelect}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
            </motion.header>

            {status.message && (
              <div
                className={`rounded-lg p-4 ${
                  status.type === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-green-50 text-green-800 border border-green-200"
                }`}
              >
                {status.message}
              </div>
            )}

            <div className="space-y-6">
              <div className="rounded-2xl border border-amber-100 bg-white/90 p-6 shadow-sm">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Select GSTR-2B File
                </label>
                <select
                  value={selectedGstr2bIdForPR}
                  onChange={(e) => setSelectedGstr2bIdForPR(e.target.value)}
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  disabled={loading || comparing}
                >
                  <option value="">-- Select GSTR-2B file --</option>
                  {gstr2bImports.map((imp) => (
                    <option key={imp._id} value={imp._id}>
                      {imp.sheetName || "GSTR-2B"} - {new Date(imp.uploadedAt || imp.createdAt || Date.now()).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {gstr2bImports.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">
                    No GSTR-2B files found for this company.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-amber-100 bg-white/90 p-6 shadow-sm">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Upload Purchase Register Excel File
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handlePurchaseRegFileChange}
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-2 text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  disabled={loading || comparing}
                />
                {purchaseRegFile && (
                  <p className="mt-2 text-sm text-slate-600">
                    Selected: {purchaseRegFile.name}
                  </p>
                )}
              </div>

              <button
                onClick={handleComparePurchaseReg}
                disabled={!selectedGstr2bIdForPR || !purchaseRegFile || comparing || loading}
                className="w-full rounded-lg bg-amber-600 px-6 py-3 text-white font-semibold shadow-sm transition hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {comparing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <FiDownload className="w-5 h-5" />
                    Compare & Download
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </section>
    </motion.main>
  );
};

export default Comparisons;


