import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiFileText,
  FiRefreshCw,
  FiPackage,
  FiLayers,
  FiTag,
  FiMapPin,
  FiBox,
  FiSettings,
  FiAlertCircle,
  FiDollarSign,
  FiTrendingUp,
  FiBriefcase,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasters } from "../services/companymasterservices.js";

const InventoryHome = () => {
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

  const handleMasterClick = (masterType) => {
    if (!selectedCompany) {
      setStatus({
        type: "error",
        message: "Please select a company first.",
      });
      return;
    }
    navigate(`/inventory/${selectedCompany._id}/${masterType}`);
  };

  const handlePhase2Click = (path) => {
    if (!selectedCompany) {
      setStatus({
        type: "error",
        message: "Please select a company first.",
      });
      return;
    }
    navigate(`/inventory/${selectedCompany._id}/${path}`);
  };

  const masterButtons = [
    {
      id: "units",
      title: "Units of Measure",
      description: "Manage simple and compound units for inventory items",
      icon: <FiPackage className="text-2xl" />,
    },
    {
      id: "groups",
      title: "Stock Groups",
      description: "Organize items into hierarchical groups",
      icon: <FiLayers className="text-2xl" />,
    },
    {
      id: "categories",
      title: "Stock Categories",
      description: "Classify items using categories",
      icon: <FiTag className="text-2xl" />,
    },
    {
      id: "godowns",
      title: "Godowns",
      description: "Manage storage locations and warehouses",
      icon: <FiMapPin className="text-2xl" />,
    },
    {
      id: "items",
      title: "Stock Items",
      description: "Create and manage inventory items with opening balances",
      icon: <FiBox className="text-2xl" />,
    },
  ];

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
            Inventory Module
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Inventory Management
          </h1>
          <p className="text-base text-slate-600">
            Manage inventory masters, features, rules, and advanced tracking for your companies.
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
            Select a company to manage its inventory masters. Company selection is required.
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

        {selectedCompany && (
          <>
            <motion.section
              className="space-y-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-slate-900">
                Phase-1: Foundation Masters
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {masterButtons.map((master) => (
                  <motion.button
                    key={master.id}
                    onClick={() => handleMasterClick(master.id)}
                    className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 text-amber-600 mb-3">
                      {master.icon}
                      <span className="text-lg font-semibold text-slate-900">
                        {master.title}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{master.description}</p>
                  </motion.button>
                ))}
              </div>
            </motion.section>

            <motion.section
              className="space-y-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-semibold text-slate-900">
                Phase-2: Inventory Rules & Advanced Features
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <motion.button
                  onClick={() => handlePhase2Click("features")}
                  className="rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 text-blue-600 mb-3">
                    <FiSettings className="text-2xl" />
                    <span className="text-lg font-semibold text-slate-900">
                      Inventory Features
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Configure global inventory features and capabilities
                  </p>
                </motion.button>

                <motion.button
                  onClick={() => handlePhase2Click("reorder-alerts")}
                  className="rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 text-blue-600 mb-3">
                    <FiAlertCircle className="text-2xl" />
                    <span className="text-lg font-semibold text-slate-900">
                      Reorder Alerts
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    View items below reorder level
                  </p>
                </motion.button>

                <motion.button
                  onClick={() => handlePhase2Click("price-lists")}
                  className="rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 text-blue-600 mb-3">
                    <FiDollarSign className="text-2xl" />
                    <span className="text-lg font-semibold text-slate-900">
                      Price Lists
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Manage price levels and item pricing
                  </p>
                </motion.button>

                <motion.button
                  onClick={() => handlePhase2Click("cost-tracking")}
                  className="rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 text-blue-600 mb-3">
                    <FiTrendingUp className="text-2xl" />
                    <span className="text-lg font-semibold text-slate-900">
                      Cost Tracking
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Track costs per item and party
                  </p>
                </motion.button>

                <motion.button
                  onClick={() => handlePhase2Click("job-work")}
                  className="rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3 text-blue-600 mb-3">
                    <FiBriefcase className="text-2xl" />
                    <span className="text-lg font-semibold text-slate-900">
                      Job Work
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Manage job work orders and material movements
                  </p>
                </motion.button>
              </div>
            </motion.section>
          </>
        )}

        {!selectedCompany && (
          <motion.div
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Please select a company to access inventory masters.
          </motion.div>
        )}
      </section>
    </motion.main>
  );
};

export default InventoryHome;

