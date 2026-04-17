import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiFileText } from "react-icons/fi";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getPurchaseBills } from "../services/accountingService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const PurchaseBills = () => {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadBills();
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

  const loadBills = async () => {
    setLoading(true);
    try {
      const { data } = await getPurchaseBills(companyId);
      setBills(data || []);
    } catch (error) {
      console.error("Failed to load purchase bills:", error);
      // If endpoint doesn't exist, show empty state
      if (error.response?.status === 404) {
        setStatus({
          type: "error",
          message: "Purchase bills endpoint not yet implemented.",
        });
        setBills([]);
      } else {
        setStatus({
          type: "error",
          message: "Unable to load purchase bills. Please try again.",
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
            Purchase Bills
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Purchase Bills"}
          </h1>
          <p className="text-base text-slate-600">
            View and manage purchase vouchers
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
              <FiFileText className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Purchase Vouchers</h2>
                <p className="text-xs text-slate-500">
                  All purchase bills and vouchers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadBills}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
            >
              <FiRefreshCw />
              Refresh
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FiRefreshCw className="animate-spin text-lg" />
              </div>
            ) : bills.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No purchase bills found.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                <thead className="bg-sky-50/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Invoice No
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Party
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Total Amount
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                      ITC Eligible
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                      Reverse Charge
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill, idx) => (
                    <tr
                      key={bill.voucherId || idx}
                      className="border-b border-sky-50 last:border-none hover:bg-sky-50/40"
                    >
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">
                        {bill.invoiceNumber || bill.voucherId || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {formatDate(bill.date || bill.invoiceDate)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {bill.partyName || bill.partyId || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                        ₹{formatNumber(bill.totalAmount || 0)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            bill.gst?.itcEligible !== false
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {bill.gst?.itcEligible !== false ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            bill.gst?.reverseCharge
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {bill.gst?.reverseCharge ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>
      </section>
    </motion.main>
  );
};

export default PurchaseBills;
