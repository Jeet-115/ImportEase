import { motion } from "framer-motion";
import {
  FiBook,
  FiClipboard,
  FiCornerDownRight,
  FiEdit3,
  FiLayers,
  FiShuffle,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import LoadingScreen from "../components/ui/LoadingScreen.jsx";
import { useCompanyFromRoute } from "../hooks/useCompanyFromRoute";
import {
  companyComparisonsPath,
  companyHistoryGstr2APath,
  companyHistoryGstr2BPath,
  companyHistorySalesDataPath,
  companyPartyMastersPath,
  companyProcessGstr2APath,
  companyProcessGstr2BPath,
  companyProcessSalesDataPath,
} from "../utils/companyRoutes";

const tagClass = {
  "2b": "ie-tag ie-tag--2b",
  "2a": "ie-tag ie-tag--2a",
  master: "ie-tag ie-tag--master",
  audit: "ie-tag ie-tag--audit",
  setup: "ie-tag ie-tag--setup",
  sales: "ie-tag ie-tag--sales",
};

const featureGroups = (companyId) => [
  {
    title: "GSTR-2B",
    items: [
      {
        icon: FiLayers,
        title: "Process GSTR-2B",
        text: "Upload portal Excel, map ledgers, export purchase register.",
        to: companyProcessGstr2BPath(companyId),
        tag: "2b",
      },
      {
        icon: FiClipboard,
        title: "GSTR-2B history",
        text: "Reopen past runs, re-download files, fix ledgers.",
        to: companyHistoryGstr2BPath(companyId),
        tag: "2b",
      },
    ],
  },
  {
    title: "GSTR-2A",
    items: [
      {
        icon: FiLayers,
        title: "Process GSTR-2A",
        text: "Upload CSV and prepare the purchase register step by step.",
        to: companyProcessGstr2APath(companyId),
        tag: "2a",
      },
      {
        icon: FiClipboard,
        title: "GSTR-2A history",
        text: "Review previous GSTR-2A runs for this client.",
        to: companyHistoryGstr2APath(companyId),
        tag: "2a",
      },
    ],
  },
  {
    title: "Sales data",
    items: [
      {
        icon: FiTrendingUp,
        title: "Process sales data",
        text: "Upload sales Excel or CSV and export Tally-ready sales vouchers.",
        to: companyProcessSalesDataPath(companyId),
        tag: "sales",
      },
      {
        icon: FiClipboard,
        title: "Sales data history",
        text: "Re-download processed sales files for this client.",
        to: companyHistorySalesDataPath(companyId),
        tag: "sales",
      },
    ],
  },
  {
    title: "Masters & audit",
    items: [
      {
        icon: FiUsers,
        title: "Party masters",
        text: "Party-wise details and purchase register upload.",
        to: companyPartyMastersPath(companyId),
        tag: "master",
      },
      {
        icon: FiBook,
        title: "Ledger names",
        text: "Shared purchase ledgers used across all clients.",
        to: "/ledger-names",
        tag: "master",
      },
      {
        icon: FiShuffle,
        title: "Comparisons",
        text: "Compare 2B vs 2A or vs purchase register for this client.",
        to: companyComparisonsPath(companyId),
        tag: "audit",
      },
      {
        icon: FiEdit3,
        title: "Edit client details",
        text: "Update GSTIN, address, and contact information.",
        to: "/company-masters",
        tag: "setup",
        state: { editCompanyId: companyId },
      },
    ],
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CompanyHub = () => {
  const navigate = useNavigate();
  const { company, loading, error, hubPath } = useCompanyFromRoute();

  if (loading) {
    return <LoadingScreen message="Loading client workspace…" />;
  }

  if (error || !company) {
    return (
      <div className="space-y-4">
        <BackButton label="Back to clients" fallback="/" />
        <div className="ie-alert-error">{error || "Client not found."}</div>
      </div>
    );
  }

  const groups = featureGroups(company._id);

  return (
    <div className="space-y-8">
      <BackButton label="Back to clients" fallback="/" />

      <motion.section
        className="ie-hero relative"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="ie-hero-grid" aria-hidden />
        <div className="relative z-[1] space-y-3">
          <p className="ie-eyebrow">Client workspace</p>
          <h1 className="ie-page-title">{company.companyName}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            {company.gstin ? (
              <span className="ie-stat-chip ie-mono">GSTIN {company.gstin}</span>
            ) : null}
            {company.state ? (
              <span className="ie-stat-chip">{company.state}</span>
            ) : null}
            {company.email ? (
              <span className="ie-stat-chip">{company.email}</span>
            ) : null}
          </div>
          {company.address ? (
            <p className="text-sm text-slate-500 max-w-2xl">{company.address}</p>
          ) : null}
          <p className="ie-page-desc !max-w-2xl">
            Choose a task below. This client is already selected — you will go
            straight into each workflow without picking the company again.
          </p>
        </div>
      </motion.section>

      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="ie-section-title">{group.title}</h2>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {group.items.map(
              ({ icon: Icon, title, text, to, tag, state: navState }) => (
                <motion.button
                  key={title}
                  type="button"
                  variants={item}
                  onClick={() =>
                    navigate(to, {
                      state: { company, ...navState },
                    })
                  }
                  className="ie-card ie-card-hover group flex flex-col p-5 text-left"
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-slate-50 text-lg text-teal-600 ring-1 ring-teal-100/80">
                      <Icon />
                    </span>
                    <span className={tagClass[tag]}>{tag}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-teal-800">
                    {title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">
                    {text}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600">
                    <FiCornerDownRight size={14} />
                    Open
                  </span>
                </motion.button>
              ),
            )}
          </motion.div>
        </section>
      ))}
    </div>
  );
};

export default CompanyHub;
