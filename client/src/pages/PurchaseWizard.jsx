import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiShoppingBag, FiX, FiCheck } from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import {
  getParties,
  createPurchaseWizard,
} from "../services/accountingService.js";
import { getItems } from "../services/inventoryService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const PurchaseWizard = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [gstin, setGstin] = useState("");
  const [reverseCharge, setReverseCharge] = useState(false);
  const [itcEligible, setItcEligible] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [result, setResult] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadParties();
      loadItems();
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

  const handleAddItem = (item) => {
    if (selectedItems.find((i) => i.itemId === item._id)) {
      setStatus({ type: "error", message: "Item already added" });
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        itemId: item._id,
        itemName: item.name || item._id,
        godownId: null,
        batchId: null,
        qty: 1,
        rate: 0,
      },
    ]);
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
    if (!selectedParty && !gstin) {
      setStatus({
        type: "error",
        message: "Please select a party or enter GSTIN",
      });
      return;
    }
    if (selectedItems.length === 0) {
      setStatus({ type: "error", message: "Please add at least one item" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        partyId: selectedParty?.id || null,
        gstin: gstin || null,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate || date,
        date,
        items: selectedItems.map((item) => ({
          itemId: item.itemId,
          godownId: item.godownId,
          batchId: item.batchId || null,
          qty: Math.abs(item.qty),
          rate: item.rate,
        })),
        reverseCharge,
        itcEligible,
        remarks,
      };

      const { data } = await createPurchaseWizard(companyId, payload);
      setResult(data);
      setStatus({
        type: "success",
        message: "Purchase voucher created successfully!",
      });
    } catch (error) {
      console.error("Failed to create purchase:", error);
      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Failed to create purchase voucher. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatNumber = (v) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(2);

  const totalPurchaseAmount = selectedItems.reduce(
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
        <BackButton
          label="Back to Purchase Home"
          fallback={`/accounting/${companyId}/purchase`}
        />
        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-3xl font-bold text-slate-900">Guided Purchase</h1>
          <p className="text-base text-slate-600 mt-2">
            Create purchase bills with GST matching and ITC tracking
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
            <h2 className="text-xl font-bold text-emerald-900 mb-4">
              Purchase Created Successfully!
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Invoice Number:</span>
                <span className="font-semibold text-slate-900">
                  {result.accountingVoucher?.invoiceNumber ||
                    result.purchaseVoucher?.invoiceNumber ||
                    result.accountingVoucher?.voucherId ||
                    "—"}
                </span>
              </div>
              {result.accountingVoucher?.totalAmount && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Amount:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{formatNumber(result.accountingVoucher.totalAmount)}
                  </span>
                </div>
              )}
              {result.accountingVoucher?.gst?.itcEligible !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-600">ITC Eligible:</span>
                  <span className="font-semibold text-slate-900">
                    {result.accountingVoucher.gst.itcEligible ? "Yes" : "No"}
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
                setInvoiceNumber("");
                setInvoiceDate(new Date().toISOString().split("T")[0]);
                setGstin("");
                setRemarks("");
              }}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Create Another Purchase
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              className="rounded-3xl border border-sky-100 bg-white/95 p-6 shadow-lg backdrop-blur"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Party Selection
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Select Party (or enter GSTIN for auto-match)
                  </label>
                  <select
                    value={selectedParty?.id || ""}
                    onChange={(e) => {
                      const party = parties.find((p) => p.id === e.target.value);
                      setSelectedParty(party || null);
                      if (party) {
                        setGstin(party.gst?.gstin || "");
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- Select Party --</option>
                    {parties.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name || party.id}{" "}
                        {party.gst?.gstin ? `(${party.gst.gstin})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    GSTIN (for auto-match)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="Enter GSTIN to auto-match party"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
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
                          Qty
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
                          <td className="px-3 py-2 text-xs text-slate-700">
                            {item.itemName}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.qty}
                              onChange={(e) =>
                                handleUpdateItem(
                                  item.itemId,
                                  "qty",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
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
                        <td colSpan="3" className="px-3 py-2 text-right text-xs font-semibold text-slate-700">
                          Total:
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-slate-900">
                          ₹{formatNumber(totalPurchaseAmount)}
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
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Additional Details
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={reverseCharge}
                      onChange={(e) => setReverseCharge(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-700">Reverse Charge</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={itcEligible}
                      onChange={(e) => setItcEligible(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm text-slate-700">ITC Eligible</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Remarks
                  </label>
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
                onClick={() => navigate(`/accounting/${companyId}/purchase`)}
                className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedItems.length === 0}
                className="rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <FiRefreshCw className="inline animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FiShoppingBag className="inline mr-2" />
                    Create Purchase
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

export default PurchaseWizard;
