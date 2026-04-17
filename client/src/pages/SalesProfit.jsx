import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getProfitReport } from "../services/inventoryService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const SalesProfit = () => {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadData();
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

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await getProfitReport(companyId);
      setRows(data || []);
    } catch (error) {
      console.error("Failed to load profit report:", error);
      setStatus({
        type: "error",
        message: "Unable to load profit report. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (v) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(2);

  const totals = rows.reduce(
    (acc, row) => ({
      saleValue: acc.saleValue + (row.saleValue || 0),
      cogs: acc.cogs + (row.cogs || 0),
      profit: acc.profit + (row.profit || 0),
    }),
    { saleValue: 0, cogs: 0, profit: 0 }
  );

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
            Profit Report
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Profit Report"}
          </h1>
          <p className="text-base text-slate-600">
            Analyze profit per sales transaction using FIFO COGS
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
              <FiTrendingUp className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Sales Profit (FIFO)</h2>
                <p className="text-xs text-slate-500">
                  Each row represents one sales transaction line.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
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
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No sales transactions found.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                <thead className="bg-sky-50/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Voucher
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Item
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Sale Rate
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Sale Value
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      COGS (FIFO)
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.voucherId}-${row.itemId}-${idx}`}
                      className="border-b border-sky-50 last:border-none hover:bg-sky-50/40"
                    >
                      <td className="px-3 py-2 text-xs text-slate-600">{row.date}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">
                        {row.voucherId}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {row.itemIdRef || row.itemId}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {formatNumber(row.qty)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {formatNumber(row.saleRate)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {formatNumber(row.saleValue)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {formatNumber(row.cogs)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right text-xs font-semibold ${
                          row.profit >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {formatNumber(row.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-sky-50/60">
                  <tr>
                    <td colSpan="5" className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                      Total:
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-slate-900">
                      ₹{formatNumber(totals.saleValue)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-bold text-slate-900">
                      ₹{formatNumber(totals.cogs)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right text-xs font-bold ${
                        totals.profit >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      ₹{formatNumber(totals.profit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </motion.section>
      </section>
    </motion.main>
  );
};

export default SalesProfit;


