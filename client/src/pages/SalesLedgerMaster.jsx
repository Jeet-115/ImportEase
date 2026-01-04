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
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import {
  createSalesLedger,
  deleteSalesLedger,
  getSalesLedgers,
  updateSalesLedger,
} from "../services/salesLedgerService.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const underOptions = [
  "Bank Accounts",
  "Bank OCC A/c",
  "Bank OD A/c",
  "Branch / Divisions",
  "Capital Account",
  "Cash-in-Hand",
  "Current Assets",
  "Current Liabilities",
  "Deposits (Asset)",
  "Direct Expenses",
  "Direct Incomes",
  "Duties & Taxes",
  "Expenses (Direct)",
  "Expenses (Indirect)",
  "Fix Assets [Non Depriciation]",
  "Fixed Assets",
  "Income (Direct)",
  "Income (Indirect)",
  "Indirect Expenses",
  "Indirect Incomes",
  "Investments",
  "Loans & Advances (Asset)",
  "Loans (Liability)",
  "Misc. Expenses (ASSET)",
  "Provisions",
  "Purchase Accounts",
  "Reserves & Surplus",
  "Retained Earnings",
  "Sales Accounts",
  "Secured Loans",
  "Sundry Creditors",
  "Sundry Debtors",
  "Suspense A/c",
  "Unsecured Loans",
];

const initialFormState = {
  name: "",
  under: "",
  typeOfLedger: "",
  interestCalculation: false,
  includeInAssessableValue: "",
  gstApplicability: "",
  hsnSource: "",
  hsnCode: "",
  hsnDescription: "",
  gstRateSource: "",
  taxabilityType: "",
  gstRate: "",
  reverseCharge: false,
};

const SalesLedgerMaster = () => {
  const navigate = useNavigate();
  const { user, isPlanRestricted } = useAuth();
  const [ledgers, setLedgers] = useState([]);
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
    loadLedgers();
  }, []);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const loadLedgers = async () => {
    setLoading(true);
    try {
      const { data } = await getSalesLedgers();
      setLedgers(data || []);
    } catch (error) {
      console.error("Failed to load ledgers:", error);
      setStatus({
        type: "error",
        message: "Unable to load ledgers. Please try again.",
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
        ...formData,
        name: formData.name.trim(),
        gstRate: formData.gstRate ? Number(formData.gstRate) : undefined,
      };

      // Remove empty strings for optional fields
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") {
          delete payload[key];
        }
      });

      if (editingId) {
        await updateSalesLedger(editingId, payload);
        setStatus({ type: "success", message: "Ledger updated successfully." });
      } else {
        await createSalesLedger(payload);
        setStatus({ type: "success", message: "Ledger created successfully." });
      }

      resetForm();
      await loadLedgers();
    } catch (error) {
      console.error("Failed to save ledger:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to save ledger. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (ledger) => {
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }
    setEditingId(ledger._id);
    setFormData({
      name: ledger.name || "",
      under: ledger.under || "",
      typeOfLedger: ledger.typeOfLedger || "",
      interestCalculation: ledger.interestCalculation || false,
      includeInAssessableValue: ledger.includeInAssessableValue || "",
      gstApplicability: ledger.gstApplicability || "",
      hsnSource: ledger.hsnSource || "",
      hsnCode: ledger.hsnCode || "",
      hsnDescription: ledger.hsnDescription || "",
      gstRateSource: ledger.gstRateSource || "",
      taxabilityType: ledger.taxabilityType || "",
      gstRate: ledger.gstRate || "",
      reverseCharge: ledger.reverseCharge || false,
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
      await deleteSalesLedger(id);
      setStatus({ type: "success", message: "Ledger deleted successfully." });
      await loadLedgers();
    } catch (error) {
      console.error("Failed to delete ledger:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to delete ledger. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowForm(false);
  };

  const filteredLedgers = ledgers.filter((ledger) =>
    ledger.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton
          label="Back to Sales Home"
          fallback="/sales"
          onClick={() => navigate("/sales")}
        />

        <motion.header
          className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Sales Ledger Master
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Sales Ledger Masters
          </h1>
          <p className="text-sm text-slate-600">
            Manage sales ledger masters. These are global and shared across all
            companies. All fields except Name are optional.
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
            Add New Sales Ledger
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
                {editingId ? "Edit Sales Ledger" : "Create Sales Ledger"}
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
                    Under
                    <select
                      value={formData.under}
                      onChange={(e) =>
                        setFormData({ ...formData, under: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      {underOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Type of Ledger
                    <select
                      value={formData.typeOfLedger}
                      onChange={(e) =>
                        setFormData({ ...formData, typeOfLedger: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="notapplicable">Not Applicable</option>
                      <option value="discount">Discount</option>
                      <option value="invoice_rounding">Invoice Rounding</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={formData.interestCalculation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interestCalculation: e.target.checked,
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    Interest Calculation
                  </label>
                </div>
              </div>

              {/* Statutory */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Statutory
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Include in Assessable Value
                    <select
                      value={formData.includeInAssessableValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          includeInAssessableValue: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="not_applicable">Not Applicable</option>
                      <option value="gst">GST</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    GST Applicability
                    <select
                      value={formData.gstApplicability}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gstApplicability: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="applicable">Applicable</option>
                      <option value="not_applicable">Not Applicable</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* HSN */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  HSN
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    HSN Source
                    <select
                      value={formData.hsnSource}
                      onChange={(e) =>
                        setFormData({ ...formData, hsnSource: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="as_per_company">As Per Company</option>
                      <option value="specify">Specify</option>
                      <option value="gst_classification">GST Classification</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    HSN Code
                    <input
                      type="text"
                      value={formData.hsnCode}
                      onChange={(e) =>
                        setFormData({ ...formData, hsnCode: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700 sm:col-span-2">
                    HSN Description
                    <textarea
                      value={formData.hsnDescription}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hsnDescription: e.target.value,
                        })
                      }
                      rows={2}
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                </div>
              </div>

              {/* GST */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  GST
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    GST Rate Source
                    <select
                      value={formData.gstRateSource}
                      onChange={(e) =>
                        setFormData({ ...formData, gstRateSource: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="as_per_company">As Per Company</option>
                      <option value="specify">Specify</option>
                      <option value="slab">Slab</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    Taxability Type
                    <select
                      value={formData.taxabilityType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          taxabilityType: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="exempt">Exempt</option>
                      <option value="nil_rated">Nil Rated</option>
                      <option value="non_gst">Non GST</option>
                      <option value="taxable">Taxable</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    GST Rate (%)
                    <input
                      type="number"
                      step="0.01"
                      value={formData.gstRate}
                      onChange={(e) =>
                        setFormData({ ...formData, gstRate: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={formData.reverseCharge}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reverseCharge: e.target.checked,
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    Reverse Charge
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || readOnly}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-60"
                >
                  <FiSave />
                  {editingId ? "Update Ledger" : "Create Ledger"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <FiX />
                  Cancel
                </button>
              </div>
            </form>
          </motion.section>
        )}

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
                  placeholder="Search by ledger name..."
                  className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {loading
                  ? "Loading..."
                  : searchTerm
                  ? `${filteredLedgers.length} of ${ledgers.length} ledgers`
                  : `${ledgers.length} ledgers`}
              </span>
              <button
                type="button"
                onClick={loadLedgers}
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
            ) : filteredLedgers.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {searchTerm
                  ? "No ledgers match your search."
                  : "No ledgers found. Create one to get started."}
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
                      Under
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      GST Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedgers.map((ledger, index) => (
                    <tr
                      key={ledger._id}
                      className="border-b border-amber-50 last:border-none"
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 w-16">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {ledger.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {ledger.under || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {ledger.gstRate ? `${ledger.gstRate}%` : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleEdit(ledger)}
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
                                targetId: ledger._id,
                                targetName: ledger.name,
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
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>
      </section>
      <ConfirmDialog
        open={confirmState.open}
        title="Delete sales ledger?"
        message={`Are you sure you want to delete "${confirmState.targetName}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() =>
          setConfirmState({ open: false, targetId: null, targetName: "" })
        }
        onConfirm={() => {
          const { targetId, targetName } = confirmState;
          setConfirmState({ open: false, targetId: null, targetName: "" });
          if (targetId && !readOnly) {
            handleDelete(targetId, targetName);
          }
        }}
      />
    </motion.main>
  );
};

export default SalesLedgerMaster;

