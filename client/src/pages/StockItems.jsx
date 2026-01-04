import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiEdit2,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash2,
  FiPlus,
  FiX,
} from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
} from "../services/inventoryService.js";
import {
  getUnits,
  getGroups,
  getCategories,
  getGodowns,
} from "../services/inventoryService.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const initialFormState = {
  name: "",
  alias: "",
  groupId: "",
  categoryId: "",
  unitId: "",
  alternateUnits: [],
  gst: {
    applicable: false,
    hsn: "",
    rate: "",
  },
  openingBalance: {
    quantity: "",
    rate: "",
    value: "",
    godownAllocations: [],
  },
  batchTracking: {
    enabled: false,
    trackMfgDate: false,
    trackExpiry: false,
  },
  valuationMethod: "",
  standardRates: "",
};

const StockItems = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, isPlanRestricted } = useAuth();
  const [company, setCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    targetId: null,
    targetName: "",
  });

  const readOnly = !user?.isMaster && isPlanRestricted;
  const readOnlyMessage = readOnly
    ? getPlanRestrictionMessage(user?.planStatus)
    : "";

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
      const [itemsRes, unitsRes, groupsRes, categoriesRes, godownsRes] =
        await Promise.all([
          getItems(companyId),
          getUnits(companyId),
          getGroups(companyId),
          getCategories(companyId),
          getGodowns(companyId),
        ]);
      setItems(itemsRes.data || []);
      setUnits(unitsRes.data || []);
      setGroups(groupsRes.data || []);
      setCategories(categoriesRes.data || []);
      setGodowns(godownsRes.data || []);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }

    if (!formData.name || !formData.name.trim()) {
      setStatus({ type: "error", message: "Name is required." });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        alias: formData.alias?.trim() || "",
        groupId: formData.groupId || undefined,
        categoryId: formData.categoryId || undefined,
        unitId: formData.unitId || undefined,
        alternateUnits: formData.alternateUnits || [],
        gst: {
          applicable: formData.gst?.applicable || false,
          hsn: formData.gst?.hsn?.trim() || "",
          rate: formData.gst?.rate ? Number(formData.gst.rate) : undefined,
        },
        openingBalance: formData.openingBalance?.quantity
          ? {
              quantity: Number(formData.openingBalance.quantity),
              rate: formData.openingBalance.rate
                ? Number(formData.openingBalance.rate)
                : undefined,
              value: formData.openingBalance.value
                ? Number(formData.openingBalance.value)
                : undefined,
              godownAllocations:
                formData.openingBalance.godownAllocations || [],
            }
          : undefined,
        batchTracking: {
          enabled: formData.batchTracking?.enabled || false,
          trackMfgDate: formData.batchTracking?.trackMfgDate || false,
          trackExpiry: formData.batchTracking?.trackExpiry || false,
        },
        valuationMethod: formData.valuationMethod || undefined,
        standardRates: formData.standardRates || undefined,
      };

      if (editingId) {
        await updateItem(companyId, editingId, payload);
        setStatus({ type: "success", message: "Stock item updated successfully." });
      } else {
        await createItem(companyId, payload);
        setStatus({ type: "success", message: "Stock item created successfully." });
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error("Failed to save item:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to save stock item. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }
    setEditingId(item.id);
    setFormData({
      name: item.name || "",
      alias: item.alias || "",
      groupId: item.groupId || "",
      categoryId: item.categoryId || "",
      unitId: item.unitId || "",
      alternateUnits: item.alternateUnits || [],
      gst: {
        applicable: item.gst?.applicable || false,
        hsn: item.gst?.hsn || "",
        rate: item.gst?.rate || "",
      },
      openingBalance: {
        quantity: item.openingBalance?.quantity || "",
        rate: item.openingBalance?.rate || "",
        value: item.openingBalance?.value || "",
        godownAllocations: item.openingBalance?.godownAllocations || [],
      },
      batchTracking: {
        enabled: item.batchTracking?.enabled || false,
        trackMfgDate: item.batchTracking?.trackMfgDate || false,
        trackExpiry: item.batchTracking?.trackExpiry || false,
      },
      valuationMethod: item.valuationMethod || "",
      standardRates: item.standardRates || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id, name) => {
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }
    setSubmitting(true);
    try {
      await deleteItem(companyId, id);
      setStatus({ type: "success", message: "Stock item deleted successfully." });
      await loadData();
    } catch (error) {
      console.error("Failed to delete item:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to delete stock item. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addGodownAllocation = () => {
    setFormData({
      ...formData,
      openingBalance: {
        ...formData.openingBalance,
        godownAllocations: [
          ...(formData.openingBalance.godownAllocations || []),
          { godownId: "", quantity: "" },
        ],
      },
    });
  };

  const removeGodownAllocation = (index) => {
    const allocations = [...(formData.openingBalance.godownAllocations || [])];
    allocations.splice(index, 1);
    setFormData({
      ...formData,
      openingBalance: {
        ...formData.openingBalance,
        godownAllocations: allocations,
      },
    });
  };

  const updateGodownAllocation = (index, field, value) => {
    const allocations = [...(formData.openingBalance.godownAllocations || [])];
    allocations[index] = {
      ...allocations[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      openingBalance: {
        ...formData.openingBalance,
        godownAllocations: allocations,
      },
    });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowForm(false);
  };

  const filteredItems = items.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!companyId) {
    return (
      <motion.main
        className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
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
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
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
          className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Stock Items
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Loading..."}
          </h1>
          <p className="text-sm text-slate-600">
            Create and manage inventory items with opening balances and godown allocations.
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

        {!showForm && (
          <motion.button
            onClick={() => {
              if (readOnly) {
                setStatus({ type: "error", message: readOnlyMessage });
                return;
              }
              resetForm();
              setShowForm(true);
            }}
            disabled={readOnly}
            className="w-full rounded-2xl bg-amber-500 px-4 py-3 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <FiPlus />
            Add New Stock Item
          </motion.button>
        )}

        {showForm && (
          <motion.section
            className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Stock Item" : "Create Stock Item"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Basic Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Name <span className="text-rose-500">*</span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      required
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Alias
                    <input
                      type="text"
                      value={formData.alias}
                      onChange={(e) =>
                        setFormData({ ...formData, alias: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Stock Group
                    <select
                      value={formData.groupId}
                      onChange={(e) =>
                        setFormData({ ...formData, groupId: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Stock Category
                    <select
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Unit <span className="text-rose-500">*</span>
                    <select
                      value={formData.unitId}
                      onChange={(e) =>
                        setFormData({ ...formData, unitId: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      required
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.symbol} {unit.formalName ? `(${unit.formalName})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* GST */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  GST
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.gst.applicable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gst: { ...formData.gst, applicable: e.target.checked },
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    GST Applicable
                  </label>
                  {formData.gst.applicable && (
                    <>
                      <label className="text-sm text-slate-700">
                        HSN Code
                        <input
                          type="text"
                          value={formData.gst.hsn}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gst: { ...formData.gst, hsn: e.target.value },
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                          disabled={submitting || readOnly}
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        GST Rate (%)
                        <input
                          type="number"
                          step="0.01"
                          value={formData.gst.rate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              gst: { ...formData.gst, rate: e.target.value },
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                          disabled={submitting || readOnly}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Opening Balance */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Opening Balance
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="text-sm text-slate-700">
                    Quantity
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.openingBalance.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openingBalance: {
                            ...formData.openingBalance,
                            quantity: e.target.value,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Rate
                    <input
                      type="number"
                      step="0.01"
                      value={formData.openingBalance.rate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openingBalance: {
                            ...formData.openingBalance,
                            rate: e.target.value,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Value
                    <input
                      type="number"
                      step="0.01"
                      value={formData.openingBalance.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          openingBalance: {
                            ...formData.openingBalance,
                            value: e.target.value,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                </div>

                {/* Godown Allocations */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700">
                      Godown Allocations
                    </h4>
                    <button
                      type="button"
                      onClick={addGodownAllocation}
                      disabled={submitting || readOnly}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                    >
                      <FiPlus size={14} />
                      Add Godown
                    </button>
                  </div>
                  {formData.openingBalance.godownAllocations?.map(
                    (alloc, index) => (
                      <div
                        key={index}
                        className="flex gap-2 items-end rounded-xl border border-amber-200 bg-amber-50/50 p-3"
                      >
                        <label className="flex-1 text-sm text-slate-700">
                          Godown
                          <select
                            value={alloc.godownId}
                            onChange={(e) =>
                              updateGodownAllocation(
                                index,
                                "godownId",
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                            disabled={submitting || readOnly}
                          >
                            <option value="">Select...</option>
                            {godowns.map((godown) => (
                              <option key={godown.id} value={godown.id}>
                                {godown.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex-1 text-sm text-slate-700">
                          Quantity
                          <input
                            type="number"
                            step="0.0001"
                            value={alloc.quantity}
                            onChange={(e) =>
                              updateGodownAllocation(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                            disabled={submitting || readOnly}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeGodownAllocation(index)}
                          disabled={submitting || readOnly}
                          className="mb-2 text-rose-500 hover:text-rose-700"
                        >
                          <FiX size={20} />
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Batch Tracking */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Batch Tracking
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.batchTracking.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          batchTracking: {
                            ...formData.batchTracking,
                            enabled: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    Enable Batch Tracking
                  </label>
                  {formData.batchTracking.enabled && (
                    <>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={formData.batchTracking.trackMfgDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              batchTracking: {
                                ...formData.batchTracking,
                                trackMfgDate: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                          disabled={submitting || readOnly}
                        />
                        Track Manufacturing Date
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={formData.batchTracking.trackExpiry}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              batchTracking: {
                                ...formData.batchTracking,
                                trackExpiry: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                          disabled={submitting || readOnly}
                        />
                        Track Expiry Date
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Valuation & Rates */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Valuation & Rates
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Valuation Method
                    <select
                      value={formData.valuationMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          valuationMethod: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="FIFO">FIFO (First In First Out)</option>
                      <option value="LIFO">LIFO (Last In First Out)</option>
                      <option value="Average">Average Cost</option>
                      <option value="Standard">Standard Cost</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Standard Rates
                    <input
                      type="text"
                      value={formData.standardRates}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          standardRates: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      placeholder="e.g., 100, 200, 300"
                      disabled={submitting || readOnly}
                    />
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4 border-t border-amber-100">
                <button
                  type="submit"
                  disabled={submitting || readOnly}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-60"
                >
                  {editingId ? <FiSave /> : <FiPlus />}
                  {editingId ? "Save Changes" : "Create Stock Item"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  disabled={submitting}
                >
                  <FiX />
                  Cancel
                </button>
              </div>
            </form>
          </motion.section>
        )}

        {/* Items List */}
        <motion.section
          className="rounded-3xl border border-amber-100 bg-white/95 p-0 shadow-lg backdrop-blur"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <header className="flex flex-col gap-3 border-b border-amber-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search stock items by name..."
                  className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {loading
                  ? "Loading..."
                  : searchTerm
                  ? `${filteredItems.length} of ${items.length} items`
                  : `${items.length} items`}
              </span>
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50"
              >
                <FiRefreshCw />
                Refresh
              </button>
            </div>
          </header>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FiRefreshCw className="animate-spin text-lg" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {searchTerm
                  ? "No stock items match your search."
                  : "No stock items found. Add one above to get started."}
              </p>
            ) : (
              <table className="min-w-full divide-y divide-amber-50 text-sm text-slate-700">
                <thead className="bg-amber-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Group
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Opening Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const unit = units.find((u) => u.id === item.unitId);
                    const group = groups.find((g) => g.id === item.groupId);
                    const category = categories.find((c) => c.id === item.categoryId);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-amber-50 last:border-none hover:bg-amber-50/30"
                      >
                        <td className="px-4 py-3 text-xs text-slate-400 w-16">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {item.name}
                          </div>
                          {item.alias && (
                            <div className="text-xs text-slate-500">
                              {item.alias}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">
                            {group?.name || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">
                            {category?.name || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">
                            {unit?.symbol || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700">
                            {item.openingBalance?.quantity
                              ? `${item.openingBalance.quantity} ${unit?.symbol || ""}`
                              : "—"}
                          </div>
                          {item.openingBalance?.godownAllocations?.length > 0 && (
                            <div className="text-xs text-slate-500 mt-1">
                              {item.openingBalance.godownAllocations.length} godown(s)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 w-40">
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              disabled={submitting || readOnly}
                            >
                              <FiEdit2 />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  open: true,
                                  targetId: item.id,
                                  targetName: item.name,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              disabled={submitting || readOnly}
                            >
                              <FiTrash2 />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>
      </section>
      <ConfirmDialog
        open={confirmState.open}
        title="Delete Stock Item?"
        message={`Are you sure you want to delete "${confirmState.targetName}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() =>
          setConfirmState({ open: false, targetId: null, targetName: "" })
        }
        onConfirm={() => {
          if (confirmState.targetId && !readOnly) {
            handleDelete(confirmState.targetId, confirmState.targetName);
          }
          setConfirmState({ open: false, targetId: null, targetName: "" });
        }}
      />
    </motion.main>
  );
};

export default StockItems;