import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";
import { getItemValuation } from "../services/inventoryService.js";

const ItemValuation = () => {
  const { companyId, itemId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId && itemId) {
      loadCompany();
      loadValuation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, itemId]);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const loadCompany = async () => {
    try {
      const { data: c } = await fetchCompanyMasterById(companyId);
      setCompany(c);
    } catch (error) {
      console.error("Failed to load company:", error);
      setStatus({
        type: "error",
        message: "Unable to load company.",
      });
    }
  };

  const loadValuation = async () => {
    setLoading(true);
    try {
      const { data } = await getItemValuation(companyId, itemId);
      setData(data);
    } catch (error) {
      console.error("Failed to load item valuation:", error);
      setStatus({
        type: "error",
        message: "Unable to load item valuation.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (v) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(2);

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-4xl space-y-5">
        <BackButton
          label={`Back to Stock Items`}
          fallback={`/inventory/${companyId}/items`}
          onClick={() => navigate(`/inventory/${companyId}/items`)}
        />

        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
            Item Valuation
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {data?.itemName || itemId}
          </h1>
          <p className="text-sm text-slate-600">
            Compare valuation of this item across methods.
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
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <FiRefreshCw className="animate-spin text-lg" />
            </div>
          ) : !data ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No valuation data available for this item.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">
                    Item ID: <span className="font-mono">{data.itemId}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Closing Qty: <span className="font-semibold">{formatNumber(data.qty)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadValuation}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                >
                  <FiRefreshCw />
                  Refresh
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-sky-100">
                <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                  <thead className="bg-sky-50/60">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                        Method
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
                    <tr className="border-b border-sky-50">
                      <td className="px-3 py-2 font-medium">FIFO</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.qty)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.avgCost)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.fifoValue)}</td>
                    </tr>
                    <tr className="border-b border-sky-50">
                      <td className="px-3 py-2 font-medium">Average Cost</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.qty)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.avgCost)}</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.avgValue)}</td>
                    </tr>
                    <tr className="border-b border-sky-50">
                      <td className="px-3 py-2 font-medium">Last Purchase</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.qty)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(data.lastPurchaseRate)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(data.lastPurchaseValue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium">Standard Cost</td>
                      <td className="px-3 py-2 text-right">{formatNumber(data.qty)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(data.standardCostRate)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatNumber(data.standardValue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.section>
      </section>
    </motion.main>
  );
};

export default ItemValuation;


