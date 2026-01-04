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
  getUnits,
  getSimpleUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} from "../services/inventoryService.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const initialFormState = {
  type: "simple",
  symbol: "",
  formalName: "",
  decimalPlaces: 0,
  conversion: {
    firstUnitId: "",
    factor: "",
    secondUnitId: "",
  },
};

const UnitsMaster = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, isPlanRestricted } = useAuth();
  const [company, setCompany] = useState(null);
  const [units, setUnits] = useState([]);
  const [simpleUnits, setSimpleUnits] = useState([]);
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
      loadUnits();
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

  const loadUnits = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data: allUnits } = await getUnits(companyId);
      const { data: simple } = await getSimpleUnits(companyId);
      setUnits(allUnits || []);
      setSimpleUnits(simple || []);
    } catch (error) {
      console.error("Failed to load units:", error);
      setStatus({
        type: "error",
        message: "Unable to load units. Please try again.",
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

    if (!formData.symbol || !formData.symbol.trim()) {
      setStatus({ type: "error", message: "Symbol is required." });
      return;
    }

    if (formData.type === "compound") {
      if (
        !formData.conversion.firstUnitId ||
        !formData.conversion.secondUnitId ||
        !formData.conversion.factor
      ) {
        setStatus({
          type: "error",
          message: "Compound units require first unit, second unit, and conversion factor.",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        symbol: formData.symbol.trim(),
        formalName: formData.formalName?.trim() || "",
        decimalPlaces: formData.decimalPlaces ? Number(formData.decimalPlaces) : 0,
        conversion:
          formData.type === "compound" ? formData.conversion : undefined,
      };

      if (editingId) {
        await updateUnit(companyId, editingId, payload);
        setStatus({ type: "success", message: "Unit updated successfully." });
      } else {
        await createUnit(companyId, payload);
        setStatus({ type: "success", message: "Unit created successfully." });
      }

      resetForm();
      await loadUnits();
    } catch (error) {
      console.error("Failed to save unit:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to save unit. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (unit) => {
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }
    setEditingId(unit.id);
    setFormData({
      type: unit.type || "simple",
      symbol: unit.symbol || "",
      formalName: unit.formalName || "",
      decimalPlaces: unit.decimalPlaces || 0,
      conversion: unit.conversion || {
        firstUnitId: "",
        factor: "",
        secondUnitId: "",
      },
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
      await deleteUnit(companyId, id);
      setStatus({ type: "success", message: "Unit deleted successfully." });
      await loadUnits();
    } catch (error) {
      console.error("Failed to delete unit:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to delete unit. Please retry.",
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

  const filteredUnits = units.filter(
    (unit) =>
      unit.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.formalName?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Units of Measure
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Loading..."}
          </h1>
          <p className="text-sm text-slate-600">
            Manage simple and compound units of measure for inventory items.
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
            Add New Unit
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
                {editingId ? "Edit Unit" : "Create Unit"}
              </h2>
              <button
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-700">
                  Type <span className="text-rose-500">*</span>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    required
                    disabled={submitting || readOnly || editingId}
                  >
                    <option value="simple">Simple</option>
                    <option value="compound">Compound</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700">
                  Symbol <span className="text-rose-500">*</span>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) =>
                      setFormData({ ...formData, symbol: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    required
                    disabled={submitting || readOnly}
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Formal Name
                  <input
                    type="text"
                    value={formData.formalName}
                    onChange={(e) =>
                      setFormData({ ...formData, formalName: e.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    disabled={submitting || readOnly}
                  />
                </label>
                <label className="text-sm text-slate-700">
                  Decimal Places
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.decimalPlaces}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        decimalPlaces: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    disabled={submitting || readOnly}
                  />
                </label>
              </div>

              {formData.type === "compound" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Conversion Details
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="text-sm text-slate-700">
                      First Unit <span className="text-rose-500">*</span>
                      <select
                        value={formData.conversion.firstUnitId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conversion: {
                              ...formData.conversion,
                              firstUnitId: e.target.value,
                            },
                          })
                        }
                        className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                        required
                        disabled={submitting || readOnly}
                      >
                        <option value="">Select...</option>
                        {simpleUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.symbol} {unit.formalName ? `(${unit.formalName})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm text-slate-700">
                      Factor <span className="text-rose-500">*</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.conversion.factor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conversion: {
                              ...formData.conversion,
                              factor: e.target.value,
                            },
                          })
                        }
                        className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                        required
                        disabled={submitting || readOnly}
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Second Unit <span className="text-rose-500">*</span>
                      <select
                        value={formData.conversion.secondUnitId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            conversion: {
                              ...formData.conversion,
                              secondUnitId: e.target.value,
                            },
                          })
                        }
                        className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                        required
                        disabled={submitting || readOnly}
                      >
                        <option value="">Select...</option>
                        {simpleUnits.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.symbol} {unit.formalName ? `(${unit.formalName})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || readOnly}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-60"
                >
                  <FiSave />
                  {editingId ? "Update Unit" : "Create Unit"}
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
                  placeholder="Search by symbol or name..."
                  className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {loading
                  ? "Loading..."
                  : searchTerm
                  ? `${filteredUnits.length} of ${units.length} units`
                  : `${units.length} units`}
              </span>
              <button
                type="button"
                onClick={loadUnits}
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
            ) : filteredUnits.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {searchTerm
                  ? "No units match your search."
                  : "No units found. Create one to get started."}
              </p>
            ) : (
              <table className="min-w-full divide-y divide-amber-50 text-sm text-slate-700">
                <thead className="bg-amber-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Formal Name
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.map((unit, index) => (
                    <tr
                      key={unit.id}
                      className="border-b border-amber-50 last:border-none"
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 w-16">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700">
                          {unit.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {unit.symbol}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {unit.formalName || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleEdit(unit)}
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
                                targetId: unit.id,
                                targetName: unit.symbol,
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
        title="Delete unit?"
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

export default UnitsMaster;

