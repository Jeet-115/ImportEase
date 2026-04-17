import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiTrendingDown } from "react-icons/fi";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getPurchaseITC } from "../services/accountingService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const PurchaseITC = () => {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [itcData, setItcData] = useState(null);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadITC();
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

  const loadITC = async () => {
    setLoading(true);
    try {
      const { data } = await getPurchaseITC(companyId);
      setItcData(data);
    } catch (error) {
      console.error("Failed to load ITC report:", error);
      // If endpoint doesn't exist, show empty state
      if (error.response?.status === 404) {
        setStatus({
          type: "error",
          message: "ITC report endpoint not yet implemented.",
        });
        setItcData({
          eligible: 0,
          ineligible: 0,
          blocked: 0,
          reverseCharge: 0,
          details: [],
        });
      } else {
        setStatus({
          type: "error",
          message: "Unable to load ITC report. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (v) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(2);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const summary = itcData || {
    eligible: 0,
    ineligible: 0,
    blocked: 0,
    reverseCharge: 0,
    details: [],
  };

  const details = summary.details || [];

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
            ITC Report
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "ITC Report"}
          </h1>
          <p className="text-base text-slate-600">
            Input Tax Credit eligibility and tracking
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
          className="rounded-3xl border border-sky-100 bg-white/95 p-4 sm:p-6 shadow-lg backdrop-blur space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiTrendingDown className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">ITC Summary</h2>
                <p className="text-xs text-slate-500">
                  Input Tax Credit breakdown
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadITC}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
            >
              <FiRefreshCw />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs text-emerald-700 mb-1">Eligible</div>
              <div className="text-lg font-bold text-emerald-900">
                ₹{formatNumber(summary.eligible || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs text-rose-700 mb-1">Ineligible</div>
              <div className="text-lg font-bold text-rose-900">
                ₹{formatNumber(summary.ineligible || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs text-amber-700 mb-1">Blocked</div>
              <div className="text-lg font-bold text-amber-900">
                ₹{formatNumber(summary.blocked || 0)}
              </div>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
              <div className="text-xs text-purple-700 mb-1">Reverse Charge</div>
              <div className="text-lg font-bold text-purple-900">
                ₹{formatNumber(summary.reverseCharge || 0)}
              </div>
            </div>
          </div>
        </motion.section>

        {details.length > 0 && (
          <motion.section
            className="rounded-3xl border border-sky-100 bg-white/95 p-4 sm:p-6 shadow-lg backdrop-blur space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-3">
              <FiTrendingDown className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">ITC Details</h2>
                <p className="text-xs text-slate-500">
                  Purchase-wise ITC breakdown
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                <thead className="bg-sky-50/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Invoice
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Party
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Taxable Value
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      GST
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      ITC Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => {
                    const status = row.itcEligible === false
                      ? "Ineligible"
                      : row.blocked
                        ? "Blocked"
                        : row.reverseCharge
                          ? "Reverse Charge"
                          : "Eligible";
                    const statusColor =
                      status === "Eligible"
                        ? "bg-emerald-100 text-emerald-700"
                        : status === "Ineligible"
                          ? "bg-rose-100 text-rose-700"
                          : status === "Blocked"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-purple-100 text-purple-700";
                    return (
                      <tr
                        key={idx}
                        className="border-b border-sky-50 last:border-none hover:bg-sky-50/40"
                      >
                        <td className="px-3 py-2 text-xs font-mono text-slate-700">
                          {row.invoiceNumber || row.voucherId || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-700">
                          {row.partyName || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(row.taxableValue || row.totalAmount || 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(row.gstAmount || row.totalGst || 0)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold">
                          ₹{formatNumber(row.itcAmount || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}
      </section>
    </motion.main>
  );
};

export default PurchaseITC;
