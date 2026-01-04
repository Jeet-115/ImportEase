import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiFileText, FiRefreshCw, FiUsers, FiBook } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasters } from "../services/companymasterservices.js";

const SalesHome = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    const loadCompanies = async () => {
      setLoading(true);
      try {
        const { data } = await fetchCompanyMasters();
        setCompanies(data || []);
      } catch (error) {
        console.error("Failed to load companies:", error);
        setStatus({
          type: "error",
          message: "Unable to load companies. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSalesPartyMaster = () => {
    if (!selectedCompany) {
      setStatus({
        type: "error",
        message: "Please select a company first.",
      });
      return;
    }
    navigate(`/sales/party-master/${selectedCompany._id}`);
  };

  const handleSalesLedgerMaster = () => {
    navigate("/sales/ledger-master");
  };

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton label="Back to home" fallback="/" />

        <motion.header
          className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Sales Module
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Sales Management
          </h1>
          <p className="text-base text-slate-600">
            Manage sales party masters and ledger masters for your companies.
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

        <motion.section
          className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Select Company
          </h2>
          <p className="text-sm text-slate-600">
            Select a company to manage its sales party masters. This selection
            is required for Sales Party Master.
          </p>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <FiRefreshCw className="animate-spin text-lg" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <motion.button
                  key={company._id}
                  onClick={() => setSelectedCompany(company)}
                  className={`rounded-2xl border p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                    selectedCompany?._id === company._id
                      ? "border-amber-400 bg-amber-50"
                      : "border-amber-100 bg-white/90"
                  }`}
                >
                  <div className="flex items-center gap-3 text-amber-600">
                    <FiFileText />
                    <span className="text-sm font-semibold uppercase tracking-wide text-amber-500">
                      {company.companyName}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    GSTIN: {company.gstin || "—"}
                  </p>
                </motion.button>
              ))}
            </div>
          )}

          {!loading && !companies.length ? (
            <p className="text-center text-slate-500">
              No companies found. Create one first from Company Masters.
            </p>
          ) : null}
        </motion.section>

        <motion.section
          className="grid gap-4 sm:grid-cols-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button
            onClick={handleSalesPartyMaster}
            disabled={!selectedCompany}
            className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: selectedCompany ? 1.02 : 1 }}
            whileTap={{ scale: selectedCompany ? 0.98 : 1 }}
          >
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <FiUsers className="text-2xl" />
              <span className="text-lg font-semibold text-slate-900">
                Sales Party Master
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Manage sales party masters for the selected company. Company
              selection is required.
            </p>
            {selectedCompany && (
              <p className="mt-2 text-xs text-amber-600 font-medium">
                Selected: {selectedCompany.companyName}
              </p>
            )}
          </motion.button>

          <motion.button
            onClick={handleSalesLedgerMaster}
            className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <FiBook className="text-2xl" />
              <span className="text-lg font-semibold text-slate-900">
                Sales Ledger Master
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Manage sales ledger masters. These are global and shared across
              all companies.
            </p>
          </motion.button>
        </motion.section>
      </section>
    </motion.main>
  );
};

export default SalesHome;

