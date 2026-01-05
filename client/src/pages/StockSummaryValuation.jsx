import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiTrendingUp } from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";
import { getValuationStockSummary } from "../services/inventoryService.js";

const METHODS = [
  { value: "FIFO", label: "FIFO" },
  { value: "AVG", label: "Average Cost" },
  { value: "LAST", label: "Last Purchase" },
  { value: "STD", label: "Standard Cost" },
];

const StockSummaryValuation = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [method, setMethod] = useState("FIFO");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadData(method);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }
  };

  const loadData = async (m) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await getValuationStockSummary(companyId, m);
      setRows(data || []);
    } catch (error) {
      console.error("Failed to load stock summary:", error);
      setStatus({
        type: "error",
        message: "Unable to load stock summary. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (e) => {
    const m = e.target.value;
    setMethod(m);
    loadData(m);
  };

  const formatNumber = (v) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(2);

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton
          label="Back to Inventory"
          fallback="/inventory"
          onClick={() => navigate(`/inventory/${companyId}`)}
        />

        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
            Stock Valuation
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Stock Summary"}
          </h1>
          <p className="text-sm text-slate-600">
            View closing stock quantity, rate, and value using different valuation methods.
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <FiTrendingUp className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Valuation Method
                </h2>
                <p className="text-xs text-slate-500">
                  Choose a method to recompute stock value from the ledger.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={method}
                onChange={handleMethodChange}
                className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadData(method)}
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              >
                <FiRefreshCw />
                Refresh
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FiRefreshCw className="animate-spin text-lg" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No stock found for this company.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                <thead className="bg-sky-50/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Item ID
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Godown
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Batch
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Qty
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Rate
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={`${row.itemId}-${row.godownId}-${row.batchId}-${idx}`}
                      className="border-b border-sky-50 last:border-none hover:bg-sky-50/40"
                    >
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">
                        {row.itemId}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {row.godownId || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {row.batchId || "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-slate-700">
                        {formatNumber(row.qty)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-slate-700">
                        {formatNumber(row.rate)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-slate-900 font-semibold">
                        {formatNumber(row.value)}
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

export default StockSummaryValuation;


