import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiShoppingCart, FiX, FiCheck } from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getParties, getPartyOutstandingSummary, createSalesWizard } from "../services/accountingService.js";
import { getItems } from "../services/inventoryService.js";
import { getStock } from "../services/inventoryService.js";
import { getItemValuation } from "../services/inventoryService.js";

const SalesWizard = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyOutstanding, setPartyOutstanding] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadParties();
    loadItems();
  }, [companyId]);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (selectedParty) {
      loadPartyOutstanding();
    }
  }, [selectedParty, companyId]);

  const loadParties = async () => {
    setLoading(true);
    try {
      const { data } = await getParties(companyId);
      setParties(data || []);
    } catch (error) {
      console.error("Failed to load parties:", error);
      setStatus({
        type: "error",
        message: "Unable to load parties. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const { data } = await getItems(companyId);
      setItems(data || []);
    } catch (error) {
      console.error("Failed to load items:", error);
      setStatus({
        type: "error",
        message: "Unable to load items. Please try again.",
      });
    }
  };

  const loadPartyOutstanding = async () => {
    if (!selectedParty) return;
    try {
      const { data } = await getPartyOutstandingSummary(companyId, selectedParty.id);
      setPartyOutstanding(data);
    } catch (error) {
      console.error("Failed to load outstanding:", error);
    }
  };

  const handleAddItem = async (item) => {
    if (selectedItems.find((i) => i.itemId === item._id)) {
      setStatus({ type: "error", message: "Item already added" });
      return;
    }

    // Get stock and valuation
    try {
      const [stockData, valuationData] = await Promise.all([
        getStock(companyId, item._id, null, null).catch(() => ({ data: { stock: 0 } })),
        getItemValuation(companyId, item._id).catch(() => ({ data: { marketRate: 0 } })),
      ]);

      const stock = stockData?.data?.stock || 0;
      const autoPrice = valuationData?.data?.marketRate || 0;

      setSelectedItems([
        ...selectedItems,
        {
          itemId: item._id,
          itemName: item.name || item._id,
          godownId: null,
          batchId: null,
          qty: 1,
          rate: autoPrice,
          stock,
          autoPrice,
        },
      ]);
    } catch (error) {
      console.error("Failed to load item details:", error);
      setSelectedItems([
        ...selectedItems,
        {
          itemId: item._id,
          itemName: item.name || item._id,
          godownId: null,
          batchId: null,
          qty: 1,
          rate: 0,
          stock: 0,
          autoPrice: 0,
        },
      ]);
    }
  };

  const handleRemoveItem = (itemId) => {
    setSelectedItems(selectedItems.filter((i) => i.itemId !== itemId));
  };

  const handleUpdateItem = (itemId, field, value) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.itemId === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParty) {
      setStatus({ type: "error", message: "Please select a party" });
      return;
    }
    if (selectedItems.length === 0) {
      setStatus({ type: "error", message: "Please add at least one item" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        partyId: selectedParty.id,
        date,
        items: selectedItems.map((item) => ({
          itemId: item.itemId,
          godownId: item.godownId,
          batchId: item.batchId || null,
          qty: -Math.abs(item.qty), // Negative for sales
          rate: item.rate,
        })),
        remarks,
      };

      const { data } = await createSalesWizard(companyId, payload);
      setResult(data);
      setStatus({
        type: "success",
        message: "Sales voucher created successfully!",
      });
    } catch (error) {
      console.error("Failed to create sales:", error);
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to create sales voucher. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatNumber = (v) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(2);

  const totalSaleAmount = selectedItems.reduce(
    (sum, item) => sum + Math.abs(item.qty) * (item.rate || 0),
    0
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
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-3xl font-bold text-slate-900">Guided Sales</h1>
          <p className="text-base text-slate-600 mt-2">
            Create sales with auto-pricing, credit validation, and profit calculation
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

        {result ? (
          <motion.div
            className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <h2 className="text-xl font-bold text-emerald-900 mb-4">Sales Created Successfully!</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Invoice Number:</span>
                <span className="font-semibold text-slate-900">
                  {result.salesVoucher?.voucherNo || result.accountingVoucher?.voucherId || "—"}
                </span>
              </div>
              {result.profit && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sale Amount:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{formatNumber(result.profit.saleAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">COGS:</span>
                    <span className="font-semibold text-slate-900">
                      ₹{formatNumber(result.profit.cogs)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Profit:</span>
                    <span
                      className={`font-semibold ${
                        result.profit.profit >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      ₹{formatNumber(result.profit.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Profit Margin:</span>
                    <span className="font-semibold text-slate-900">
                      {formatNumber(result.profit.profitMargin)}%
                    </span>
                  </div>
                </>
              )}
              {partyOutstanding && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Outstanding:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{formatNumber(partyOutstanding.totalOutstanding)}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setResult(null);
                setSelectedParty(null);
                setSelectedItems([]);
                setDate(new Date().toISOString().split("T")[0]);
                setRemarks("");
              }}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Create Another Sale
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              className="rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-lg backdrop-blur"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Party Selection</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Select Party
                  </label>
                  <select
                    value={selectedParty?.id || ""}
                    onChange={(e) => {
                      const party = parties.find((p) => p.id === e.target.value);
                      setSelectedParty(party || null);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  >
                    <option value="">-- Select Party --</option>
                    {parties.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name || party.id} {party.gst?.gstin ? `(${party.gst.gstin})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedParty && partyOutstanding && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-amber-700">Credit Limit:</span>
                      <span className="font-semibold text-amber-900">
                        ₹{formatNumber(selectedParty.creditLimit || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="text-amber-700">Current Outstanding:</span>
                      <span className="font-semibold text-amber-900">
                        ₹{formatNumber(partyOutstanding.totalOutstanding || 0)}
                      </span>
                    </div>
                    {selectedParty.creditLimit > 0 && (
                      <div className="flex justify-between">
                        <span className="text-amber-700">Available Credit:</span>
                        <span className="font-semibold text-amber-900">
                          ₹{formatNumber(
                            selectedParty.creditLimit - (partyOutstanding.totalOutstanding || 0)
                          )}
                        </span>
                      </div>
                    )}
                    {partyOutstanding.overdueAmount > 0 && (
                      <div className="mt-2 text-rose-700 font-semibold">
                        ⚠ Overdue: ₹{formatNumber(partyOutstanding.overdueAmount)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              className="rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-lg backdrop-blur"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Items</h2>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Add Item
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const item = items.find((i) => i._id === e.target.value);
                        if (item) handleAddItem(item);
                        e.target.value = "";
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- Select Item to Add --</option>
                    {items
                      .filter((item) => !selectedItems.find((si) => si.itemId === item._id))
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name || item._id}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {selectedItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                          Item
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                          Stock
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                          Auto Price
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                          Rate
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedItems.map((item) => (
                        <tr key={item.itemId} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-xs text-slate-700">{item.itemName}</td>
                          <td className="px-3 py-2 text-right text-xs text-slate-600">
                            {formatNumber(item.stock)}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateItem(item.itemId, "qty", parseFloat(e.target.value) || 0)
                              }
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-slate-600">
                            ₹{formatNumber(item.autoPrice)}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.itemId,
                                  "rate",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                            ₹{formatNumber(Math.abs(item.qty) * (item.rate || 0))}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.itemId)}
                              className="text-rose-600 hover:text-rose-700"
                            >
                              <FiX className="inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan="5" className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                          Total:
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-slate-900">
                          ₹{formatNumber(totalSaleAmount)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </motion.div>

            <motion.div
              className="rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-lg backdrop-blur"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Additional Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </motion.div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/accounting/${companyId}/sales`)}
                className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedParty || selectedItems.length === 0}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <FiRefreshCw className="inline animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FiShoppingCart className="inline mr-2" />
                    Create Sale
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </motion.main>
  );
};

export default SalesWizard;
