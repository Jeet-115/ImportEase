import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiShoppingBag,
  FiFileText,
  FiDollarSign,
  FiTrendingDown,
  FiRefreshCw,
  FiUpload,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const PurchaseHome = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });

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
      setStatus({
        type: "error",
        message: "Unable to load company. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    navigate(`/accounting/${companyId}/${path}`);
  };

  const menuItems = [
    {
      id: "gst2b-import",
      title: "GST-2B Import",
      description: "Import purchase bills from GST-2B data",
      icon: <FiUpload className="text-2xl" />,
      path: "purchase/gst2b",
      color: "blue",
    },
    {
      id: "guided-purchase",
      title: "Guided Purchase",
      description: "Create purchase bills with GST matching and ITC tracking",
      icon: <FiShoppingBag className="text-2xl" />,
      path: "purchase/wizard",
      color: "emerald",
    },
    {
      id: "purchase-bills",
      title: "Purchase Bills",
      description: "View and manage purchase vouchers",
      icon: <FiFileText className="text-2xl" />,
      path: "purchase/bills",
      color: "purple",
    },
    {
      id: "outstanding",
      title: "Outstanding",
      description: "View party-wise outstanding purchase bills",
      icon: <FiDollarSign className="text-2xl" />,
      path: "purchase/outstanding",
      color: "amber",
    },
    {
      id: "itc",
      title: "ITC Report",
      description: "Input Tax Credit eligibility and tracking",
      icon: <FiTrendingDown className="text-2xl" />,
      path: "purchase/itc",
      color: "green",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FiRefreshCw className="animate-spin text-2xl text-slate-500" />
      </div>
    );
  }

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton label="Back to Home" fallback="/" />

        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
            Phase-5: Purchase Engine
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Purchase Home ({company?.companyName || "Loading..."})
          </h1>
          <p className="text-base text-slate-600">
            Guided purchases with GST matching, ITC tracking, and cost allocation.
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={() => handleNavigate(item.path)}
              className={`rounded-3xl border border-${item.color}-100 bg-white/95 p-6 shadow-lg backdrop-blur text-left transition hover:-translate-y-1 hover:shadow-xl`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`flex items-center gap-3 text-${item.color}-600 mb-3`}>
                {item.icon}
                <span className="text-lg font-semibold text-slate-900">{item.title}</span>
              </div>
              <p className="text-sm text-slate-600">{item.description}</p>
            </motion.button>
          ))}
        </div>
      </section>
    </motion.main>
  );
};

export default PurchaseHome;
