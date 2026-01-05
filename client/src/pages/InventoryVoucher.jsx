import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiSave, FiRefreshCw, FiPlus, FiX } from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";
import {
  getItems,
  getGodowns,
  getBatches,
  getBOMs,
  getJobOrders,
} from "../services/inventoryService.js";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

// This is a generic voucher entry page - can be customized per voucher type
const InventoryVoucher = () => {
  const { companyId, voucherType } = useParams();
  const navigate = useNavigate();
  const { user, isPlanRestricted } = useAuth();
  const [company, setCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [formData, setFormData] = useState({
    voucherNo: "",
    date: new Date().toISOString().split("T")[0],
    partyId: "",
    items: [],
    trackingNo: "",
    remarks: "",
  });

  const readOnly = !user?.isMaster && isPlanRestricted;
  const readOnlyMessage = readOnly
    ? getPlanRestrictionMessage(user?.planStatus)
    : "";

  const voucherTypes = {
    "receipt-notes": { title: "Receipt Note", api: "createReceiptNote" },
    "delivery-notes": { title: "Delivery Note", api: "createDeliveryNote" },
    purchases: { title: "Purchase Voucher", api: "createPurchaseVoucher" },
    sales: { title: "Sales Voucher", api: "createSalesVoucher" },
    "stock-journal": { title: "Stock Journal", api: "createStockJournal" },
    manufacturing: { title: "Manufacturing", api: "createManufacturing" },
    "physical-stock": { title: "Physical Stock", api: "createPhysicalStock" },
  };

  const currentVoucher = voucherTypes[voucherType] || voucherTypes["receipt-notes"];

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
      setStatus({
        type: "error",
        message: "Unable to load company. Please try again.",
      });
    }
  };

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [itemsRes, godownsRes] = await Promise.all([
        getItems(companyId),
        getGodowns(companyId),
      ]);
      setItems(itemsRes.data || []);
      setGodowns(godownsRes.data || []);
      
      // Load batches if needed
      if (voucherType !== "physical-stock") {
        try {
          const batchesRes = await getBatches(companyId);
          setBatches(batchesRes.data || []);
        } catch (e) {
          // Batches might not be enabled
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      setStatus({
        type: "error",
        message: "Unable to load data. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemId: "",
          godownId: "",
          batchId: "",
          qty: "",
          rate: "",
          value: "",
        },
      ],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }

    if (!formData.voucherNo || !formData.date || formData.items.length === 0) {
      setStatus({ type: "error", message: "Voucher number, date, and at least one item are required." });
      return;
    }

    // Validate items
    for (const item of formData.items) {
      if (!item.itemId || !item.godownId || !item.qty) {
        setStatus({ type: "error", message: "All items must have item, godown, and quantity." });
        return;
      }
    }

    setSubmitting(true);
    try {
      const { createReceiptNote, createDeliveryNote, createPurchaseVoucher, createSalesVoucher, createStockJournal, createManufacturing, createPhysicalStock } = await import("../services/inventoryService.js");
      
      const apiMap = {
        "receipt-notes": createReceiptNote,
        "delivery-notes": createDeliveryNote,
        purchases: createPurchaseVoucher,
        sales: createSalesVoucher,
        "stock-journal": createStockJournal,
        manufacturing: createManufacturing,
        "physical-stock": createPhysicalStock,
      };

      const apiCall = apiMap[voucherType] || createReceiptNote;
      await apiCall(companyId, formData);
      
      setStatus({ type: "success", message: `${currentVoucher.title} created successfully.` });
      // Reset form
      setFormData({
        voucherNo: "",
        date: new Date().toISOString().split("T")[0],
        partyId: "",
        items: [],
        trackingNo: "",
        remarks: "",
      });
    } catch (error) {
      console.error("Failed to save voucher:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to save voucher. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!companyId) {
    return (
      <motion.main
        className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <section className="mx-auto max-w-5xl">
          <BackButton label="Back to Inventory Home" fallback="/inventory" />
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            Company ID is required.
          </div>
        </section>
      </motion.main>
    );
  }

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton
          label="Back to Inventory Home"
          fallback="/inventory"
          onClick={() => navigate("/inventory")}
        />

        <motion.header
          className="rounded-3xl border border-green-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green-500">
            {currentVoucher.title}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Loading..."}
          </h1>
          <p className="text-sm text-slate-600">
            Create {currentVoucher.title.toLowerCase()} to move stock in the ledger.
          </p>
        </motion.header>

        <PlanRestrictionBanner />

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

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <FiRefreshCw className="animate-spin text-lg" />
          </div>
        ) : (
          <motion.section
            className="rounded-3xl border border-green-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Voucher Number <span className="text-rose-500">*</span>
                  <input
                    type="text"
                    value={formData.voucherNo}
                    onChange={(e) =>
                      setFormData({ ...formData, voucherNo: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                    required
                    disabled={submitting || readOnly}
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Date <span className="text-rose-500">*</span>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                    required
                    disabled={submitting || readOnly}
                  />
                </label>
                {(voucherType === "receipt-notes" || voucherType === "delivery-notes" || voucherType === "purchases" || voucherType === "sales") && (
                  <label className="text-sm text-slate-700">
                    Tracking Number
                    <input
                      type="text"
                      value={formData.trackingNo}
                      onChange={(e) =>
                        setFormData({ ...formData, trackingNo: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-green-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                      placeholder="Leave empty for 'Not Applicable'"
                      disabled={submitting || readOnly}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Items
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    disabled={submitting || readOnly}
                    className="inline-flex items-center gap-1 rounded-full border border-green-200 px-3 py-1 text-xs font-semibold text-green-600 hover:bg-green-50 disabled:opacity-50"
                  >
                    <FiPlus size={14} />
                    Add Item
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-xl border border-green-200 bg-green-50/50 p-4 sm:grid-cols-6"
                  >
                    <label className="text-sm text-slate-700">
                      Item <span className="text-rose-500">*</span>
                      <select
                        value={item.itemId}
                        onChange={(e) =>
                          updateItem(index, "itemId", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                        required
                        disabled={submitting || readOnly}
                      >
                        <option value="">Select...</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700">
                      Godown <span className="text-rose-500">*</span>
                      <select
                        value={item.godownId}
                        onChange={(e) =>
                          updateItem(index, "godownId", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                        required
                        disabled={submitting || readOnly}
                      >
                        <option value="">Select...</option>
                        {godowns.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {voucherType !== "physical-stock" && batches.length > 0 && (
                      <label className="text-sm text-slate-700">
                        Batch
                        <select
                          value={item.batchId || ""}
                          onChange={(e) =>
                            updateItem(index, "batchId", e.target.value || null)
                          }
                          className="mt-2 w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                          disabled={submitting || readOnly}
                        >
                          <option value="">None</option>
                          {batches
                            .filter((b) => b.itemId === item.itemId)
                            .map((b) => (
                              <option key={b.batchId} value={b.batchId}>
                                {b.batchNo}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <label className="text-sm text-slate-700">
                      Quantity <span className="text-rose-500">*</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(index, "qty", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                        required
                        disabled={submitting || readOnly}
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Rate
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) =>
                          updateItem(index, "rate", e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100"
                        disabled={submitting || readOnly}
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={submitting || readOnly}
                        className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <FiX />
                      </button>
                    </div>
                  </div>
                ))}

                {formData.items.length === 0 && (
                  <p className="text-center text-sm text-slate-500 py-4">
                    No items added. Click "Add Item" to start.
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-green-100">
                <button
                  type="submit"
                  disabled={submitting || readOnly || formData.items.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-white text-sm font-semibold shadow hover:bg-green-700 disabled:opacity-60"
                >
                  <FiSave />
                  Save {currentVoucher.title}
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </section>
    </motion.main>
  );
};

export default InventoryVoucher;

