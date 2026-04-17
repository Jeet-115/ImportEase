import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiDollarSign } from "react-icons/fi";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getAllOutstanding } from "../services/accountingService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const SalesOutstanding = () => {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState([]);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadOutstanding();
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

  const loadOutstanding = async () => {
    setLoading(true);
    try {
      const { data } = await getAllOutstanding(companyId);
      // Filter for sales vouchers only
      const salesOutstanding = (data || []).filter(
        (item) => item.voucherType === "SALES" || item.voucherType === "sales"
      );
      setOutstanding(salesOutstanding);
    } catch (error) {
      console.error("Failed to load outstanding:", error);
      setStatus({
        type: "error",
        message: "Unable to load outstanding. Please try again.",
      });
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

  const calculateOverdueDays = (dueDate) => {
    if (!dueDate) return null;
    try {
      const due = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      due.setHours(0, 0, 0, 0);
      const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return null;
    }
  };

  // Group by party
  const groupedByParty = outstanding.reduce((acc, item) => {
    const partyId = item.partyId || item.partyName || "Unknown";
    if (!acc[partyId]) {
      acc[partyId] = {
        partyId,
        partyName: item.partyName || partyId,
        bills: [],
        totalOutstanding: 0,
        totalOverdue: 0,
        totalInterest: 0,
        totalProfit: 0,
      };
    }
    acc[partyId].bills.push(item);
    acc[partyId].totalOutstanding += item.balance || item.outstanding || 0;
    const overdueDays = calculateOverdueDays(item.dueDate);
    if (overdueDays > 0) {
      acc[partyId].totalOverdue += item.balance || item.outstanding || 0;
    }
    acc[partyId].totalInterest += item.interest || 0;
    acc[partyId].totalProfit += item.profit || 0;
    return acc;
  }, {});

  const partyGroups = Object.values(groupedByParty);

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton label="Back to Sales Home" fallback={`/accounting/${companyId}/sales`} />
        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
            Sales Outstanding
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Sales Outstanding"}
          </h1>
          <p className="text-base text-slate-600">
            View party-wise outstanding bills and overdue amounts
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
              <FiDollarSign className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Outstanding Bills</h2>
                <p className="text-xs text-slate-500">
                  Party-wise outstanding with profit and interest
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadOutstanding}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
            >
              <FiRefreshCw />
              Refresh
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FiRefreshCw className="animate-spin text-lg" />
              </div>
            ) : partyGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No outstanding bills found.
              </p>
            ) : (
              partyGroups.map((party) => (
                <div
                  key={party.partyId}
                  className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{party.partyName}</h3>
                      <p className="text-xs text-slate-600">{party.partyId}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-600">Total Outstanding</div>
                      <div className="text-sm font-bold text-amber-700">
                        ₹{formatNumber(party.totalOutstanding)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="text-slate-600">Overdue</div>
                      <div className="font-semibold text-rose-700">
                        ₹{formatNumber(party.totalOverdue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600">Interest</div>
                      <div className="font-semibold text-amber-700">
                        ₹{formatNumber(party.totalInterest)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600">Profit</div>
                      <div className="font-semibold text-emerald-700">
                        ₹{formatNumber(party.totalProfit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-600">Bills</div>
                      <div className="font-semibold text-slate-700">{party.bills.length}</div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-amber-100 text-xs">
                      <thead className="bg-amber-100/60">
                        <tr>
                          <th className="px-2 py-1 text-left font-semibold text-slate-600">
                            Invoice
                          </th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-600">
                            Date
                          </th>
                          <th className="px-2 py-1 text-left font-semibold text-slate-600">
                            Due Date
                          </th>
                          <th className="px-2 py-1 text-right font-semibold text-slate-600">
                            Sale Value
                          </th>
                          <th className="px-2 py-1 text-right font-semibold text-slate-600">
                            COGS (FIFO)
                          </th>
                          <th className="px-2 py-1 text-right font-semibold text-slate-600">
                            Profit
                          </th>
                          <th className="px-2 py-1 text-right font-semibold text-slate-600">
                            Outstanding
                          </th>
                          <th className="px-2 py-1 text-right font-semibold text-slate-600">
                            Overdue Days
                          </th>
                          <th className="px-2 py-1 text-right font-semibold text-slate-600">
                            Interest
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {party.bills.map((bill, idx) => {
                          const overdueDays = calculateOverdueDays(bill.dueDate);
                          return (
                            <tr
                              key={`${bill.voucherId}-${idx}`}
                              className="hover:bg-amber-50/50"
                            >
                              <td className="px-2 py-1 font-mono text-slate-700">
                                {bill.invoiceNumber || bill.voucherId || "—"}
                              </td>
                              <td className="px-2 py-1 text-slate-600">
                                {formatDate(bill.date)}
                              </td>
                              <td className="px-2 py-1 text-slate-600">
                                {formatDate(bill.dueDate)}
                              </td>
                              <td className="px-2 py-1 text-right text-slate-700">
                                ₹{formatNumber(bill.saleValue || bill.totalAmount || 0)}
                              </td>
                              <td className="px-2 py-1 text-right text-slate-600">
                                ₹{formatNumber(bill.cogs || 0)}
                              </td>
                              <td
                                className={`px-2 py-1 text-right font-semibold ${
                                  (bill.profit || 0) >= 0
                                    ? "text-emerald-700"
                                    : "text-rose-700"
                                }`}
                              >
                                ₹{formatNumber(bill.profit || 0)}
                              </td>
                              <td className="px-2 py-1 text-right font-semibold text-amber-700">
                                ₹{formatNumber(bill.balance || bill.outstanding || 0)}
                              </td>
                              <td
                                className={`px-2 py-1 text-right ${
                                  overdueDays > 0 ? "font-semibold text-rose-700" : "text-slate-600"
                                }`}
                              >
                                {overdueDays !== null ? overdueDays : "—"}
                              </td>
                              <td className="px-2 py-1 text-right text-amber-700">
                                ₹{formatNumber(bill.interest || 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </section>
    </motion.main>
  );
};

export default SalesOutstanding;
