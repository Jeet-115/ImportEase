import { motion } from "framer-motion";
import {
  FiBriefcase,
  FiChevronRight,
  FiMapPin,
  FiPlus,
  FiUsers,
} from "react-icons/fi";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../components/ui/LoadingScreen.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchCompanyMasters } from "../services/companymasterservices";
import { companyHubPath } from "../utils/companyRoutes";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.softwareToken) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchCompanyMasters()
      .then(({ data }) => {
        if (!cancelled) {
          setCompanies(data || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load clients. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.softwareToken]);

  if (loading) {
    return <LoadingScreen message="Loading your clients…" />;
  }

  return (
    <div className="space-y-8">
      <motion.section
        className="ie-hero relative"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="ie-hero-grid" aria-hidden />
        <div className="relative z-[1] space-y-3">
          <p className="ie-eyebrow">Start here</p>
          <h1 className="ie-page-title">Select a client to work on</h1>
          <p className="ie-page-desc">
            Pick a company from your masters below, or add a new client first.
            Once selected, you will see every GSTR workflow for that client in
            one place.
          </p>
        </div>
      </motion.section>

      {error ? <div className="ie-alert-error">{error}</div> : null}

      <section>
        <h2 className="ie-section-title">Add client</h2>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate("/company-masters")}
          className="ie-card ie-card-hover flex w-full items-center gap-4 border-dashed border-teal-200/80 bg-teal-50/30 p-5 text-left sm:max-w-md"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-2xl text-white shadow-md">
            <FiPlus />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Add new company master</p>
            <p className="mt-1 text-sm text-slate-500">
              GSTIN, address, and contact details for a new client
            </p>
          </div>
          <FiChevronRight className="shrink-0 text-teal-600" />
        </motion.button>
      </section>

      <section>
        <h2 className="ie-section-title">
          Your clients ({companies.length})
        </h2>

        {companies.length === 0 ? (
          <div className="ie-card border-dashed p-8 text-center">
            <FiBriefcase className="mx-auto text-3xl text-slate-300" />
            <p className="mt-3 font-medium text-slate-700">No clients yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add your first company master to start processing GSTR returns.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {companies.map((company) => (
              <motion.button
                key={company._id}
                type="button"
                variants={item}
                onClick={() =>
                  navigate(companyHubPath(company._id), { state: { company } })
                }
                className="ie-card ie-card-hover group flex flex-col p-5 text-left"
                whileTap={{ scale: 0.99 }}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-indigo-50 text-lg text-teal-600 ring-1 ring-teal-100/80">
                    <FiBriefcase />
                  </span>
                  <FiChevronRight className="mt-1 shrink-0 text-slate-300 transition group-hover:text-teal-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-teal-800">
                  {company.companyName}
                </h3>
                {company.mailingName &&
                company.mailingName !== company.companyName ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {company.mailingName}
                  </p>
                ) : null}
                <div className="mt-3 space-y-1.5 text-sm text-slate-500">
                  {company.gstin ? (
                    <p className="ie-mono text-xs text-slate-600">
                      GSTIN {company.gstin}
                    </p>
                  ) : null}
                  {company.state ? (
                    <p className="inline-flex items-center gap-1">
                      <FiMapPin size={12} className="opacity-70" />
                      {company.state}
                      {company.country ? `, ${company.country}` : ""}
                    </p>
                  ) : null}
                  {company.email ? (
                    <p className="inline-flex items-center gap-1 truncate">
                      <FiUsers size={12} className="opacity-70" />
                      {company.email}
                    </p>
                  ) : null}
                </div>
                <span className="mt-4 text-xs font-semibold text-teal-600">
                  Open workspace →
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default Home;
