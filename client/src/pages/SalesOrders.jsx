import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiCheck, FiX } from "react-icons/fi";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getPendingOrders, precloseOrder } from "../services/accountingService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const SalesOrders = () => {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadOrders();
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

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data } = await getPendingOrders(companyId, "SALES");
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to load orders:", error);
      setStatus({
        type: "error",
        message: "Unable to load orders. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreclose = async (orderId) => {
    if (!window.confirm("Are you sure you want to pre-close this order?")) {
      return;
    }

    try {
      await precloseOrder(companyId, "SALES", orderId);
      setStatus({
        type: "success",
        message: "Order pre-closed successfully.",
      });
      loadOrders();
    } catch (error) {
      console.error("Failed to pre-close order:", error);
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to pre-close order. Please try again.",
      });
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
        <BackButton label="Back to Sales Home" fallback={`/accounting/${companyId}/sales`} />
        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
            Sales Orders
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Sales Orders"}
          </h1>
          <p className="text-base text-slate-600">
            Manage sales orders and track deliveries
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
              <FiRefreshCw className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Pending Orders</h2>
                <p className="text-xs text-slate-500">
                  Orders with pending deliveries
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadOrders}
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
            ) : orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No pending orders found.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                <thead className="bg-sky-50/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Order ID
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Party
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Item
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Ordered
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Delivered
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Cancelled
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Pending
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Rate
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.flatMap((order) =>
                    order.items?.map((item, idx) => {
                      const pending =
                        (item.qtyOrdered || 0) -
                        (item.qtyDelivered || 0) -
                        (item.qtyCancelled || 0);
                      return (
                        <tr
                          key={`${order.orderId}-${idx}`}
                          className="border-b border-sky-50 last:border-none hover:bg-sky-50/40"
                        >
                          <td className="px-3 py-2 text-xs font-mono text-slate-700">
                            {order.orderId}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {formatDate(order.date)}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">
                            {order.partyName || order.partyId || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">
                            {item.itemName || item.itemId || "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            {formatNumber(item.qtyOrdered)}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-emerald-700">
                            {formatNumber(item.qtyDelivered)}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-rose-700">
                            {formatNumber(item.qtyCancelled)}
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-amber-700">
                            {formatNumber(pending)}
                          </td>
                          <td className="px-3 py-2 text-right text-xs">
                            ₹{formatNumber(item.rate)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                order.status === "CLOSED"
                                  ? "bg-slate-100 text-slate-700"
                                  : pending > 0
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {order.status || "OPEN"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {order.status !== "CLOSED" && pending > 0 && (
                              <button
                                onClick={() => handlePreclose(order.orderId)}
                                className="text-xs text-rose-600 hover:text-rose-700"
                                title="Pre-close Order"
                              >
                                <FiX className="inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>
      </section>
    </motion.main>
  );
};

export default SalesOrders;
