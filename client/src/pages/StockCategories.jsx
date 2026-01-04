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
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/inventoryService.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const initialFormState = {
  name: "",
  parentCategoryId: "",
};

const StockCategories = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, isPlanRestricted } = useAuth();
  const [company, setCompany] = useState(null);
  const [categories, setCategories] = useState([]);
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
      loadCategories();
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

  const loadCategories = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await getCategories(companyId);
      setCategories(data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
      setStatus({
        type: "error",
        message: "Unable to load categories. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (items, parentId = null) => {
    return items
      .filter((item) => item.parentCategoryId === parentId)
      .map((item) => ({
        ...item,
        children: buildHierarchy(items, item.id),
      }));
  };

  const flattenHierarchy = (items, level = 0) => {
    let result = [];
    items.forEach((item) => {
      result.push({ ...item, level });
      if (item.children && item.children.length > 0) {
        result = result.concat(flattenHierarchy(item.children, level + 1));
      }
    });
    return result;
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
        parentCategoryId: formData.parentCategoryId || undefined,
      };

      if (editingId) {
        await updateCategory(companyId, editingId, payload);
        setStatus({ type: "success", message: "Category updated successfully." });
      } else {
        await createCategory(companyId, payload);
        setStatus({ type: "success", message: "Category created successfully." });
      }

      resetForm();
      await loadCategories();
    } catch (error) {
      console.error("Failed to save category:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to save category. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }
    setEditingId(category.id);
    setFormData({
      name: category.name || "",
      parentCategoryId: category.parentCategoryId || "",
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
      await deleteCategory(companyId, id);
      setStatus({ type: "success", message: "Category deleted successfully." });
      await loadCategories();
    } catch (error) {
      console.error("Failed to delete category:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to delete category. Please retry.",
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

  const hierarchy = buildHierarchy(categories);
  const flatCategories = flattenHierarchy(hierarchy);
  const filteredCategories = flatCategories.filter((category) =>
    category.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Stock Categories
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Loading..."}
          </h1>
          <p className="text-sm text-slate-600">
            Manage hierarchical stock categories for classifying inventory items.
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
            Add New Stock Category
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
                {editingId ? "Edit Stock Category" : "Create Stock Category"}
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
                  Parent Category
                  <select
                    value={formData.parentCategoryId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parentCategoryId: e.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                    disabled={submitting || readOnly || editingId === formData.parentCategoryId}
                  >
                    <option value="">None (Top Level)</option>
                    {categories
                      .filter((c) => c.id !== editingId)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || readOnly}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-60"
                >
                  <FiSave />
                  {editingId ? "Update Category" : "Create Category"}
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
                  placeholder="Search by name..."
                  className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {loading
                  ? "Loading..."
                  : searchTerm
                  ? `${filteredCategories.length} of ${categories.length} categories`
                  : `${categories.length} categories`}
              </span>
              <button
                type="button"
                onClick={loadCategories}
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
            ) : filteredCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {searchTerm
                  ? "No categories match your search."
                  : "No categories found. Create one to get started."}
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
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category, index) => (
                    <tr
                      key={category.id}
                      className="border-b border-amber-50 last:border-none"
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 w-16">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="font-medium text-slate-900"
                          style={{ paddingLeft: `${category.level * 20}px` }}
                        >
                          {category.level > 0 && "└ "}
                          {category.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleEdit(category)}
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
                                targetId: category.id,
                                targetName: category.name,
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
        title="Delete stock category?"
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

export default StockCategories;

