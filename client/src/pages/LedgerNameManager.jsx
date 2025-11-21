import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import BackButton from "../components/BackButton.jsx";
import {
  createLedgerName,
  deleteLedgerName,
  fetchLedgerNames,
  updateLedgerName,
} from "../services/ledgernameservice.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const LedgerNameManager = () => {
  const [ledgerNames, setLedgerNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [confirmState, setConfirmState] = useState({
    open: false,
    targetId: null,
    targetName: "",
  });

  const loadLedgerNames = async () => {
    setLoading(true);
    try {
      const { data } = await fetchLedgerNames();
      setLedgerNames(data || []);
    } catch (error) {
      console.error("Failed to load ledger names:", error);
      setStatus({
        type: "error",
        message: "Unable to load ledger names. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgerNames();
  }, []);

  useEffect(() => {
    if (!status.message) return;
    const timer = setTimeout(() => setStatus({ type: "", message: "" }), 4000);
    return () => clearTimeout(timer);
  }, [status]);

  const formatTimestamp = (entry) => {
    const raw = entry?.updatedAt || entry?.createdAt;
    if (!raw) return "—";
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
  };

  const handleAddLedger = async (event) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setStatus({ type: "error", message: "Ledger name cannot be empty." });
      return;
    }
    setSubmitting(true);
    try {
      await createLedgerName({ name: trimmed });
      setNewName("");
      setStatus({ type: "success", message: "Ledger name added." });
      await loadLedgerNames();
    } catch (error) {
      console.error("Failed to create ledger name:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to add ledger name. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLedger = async (id, name) => {
    setSubmitting(true);
    try {
      await deleteLedgerName(id);
      setStatus({ type: "success", message: "Ledger name deleted." });
      await loadLedgerNames();
    } catch (error) {
      console.error("Failed to delete ledger name:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to delete ledger name. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (entry) => {
    setEditingId(entry._id);
    setEditingValue(entry.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const handleUpdateLedger = async (event) => {
    event.preventDefault();
    const trimmed = editingValue.trim();
    if (!trimmed) {
      setStatus({ type: "error", message: "Ledger name cannot be empty." });
      return;
    }
    setSubmitting(true);
    try {
      await updateLedgerName(editingId, { name: trimmed });
      setStatus({ type: "success", message: "Ledger name updated." });
      cancelEditing();
      await loadLedgerNames();
    } catch (error) {
      console.error("Failed to update ledger name:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to update ledger name. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-5xl space-y-5">
        <BackButton label="Back to home" fallback="/" />

        <motion.header
          className="rounded-3xl border border-amber-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
            Ledger names
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            Curate purchase ledgers
          </h1>
          <p className="text-sm text-slate-600">
            Add new ledger names, edit typos, or remove unused entries. These
            values flow into the processing step when linking purchase ledgers.
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
          className="rounded-3xl border border-amber-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <form
            onSubmit={
              editingId ? handleUpdateLedger : handleAddLedger
            }
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <label className="flex-1 text-sm text-slate-700">
              {editingId ? "Update ledger name" : "Add a new ledger name"}
              <input
                type="text"
                value={editingId ? editingValue : newName}
                onChange={(event) =>
                  editingId
                    ? setEditingValue(event.target.value)
                    : setNewName(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                placeholder="Enter ledger name"
                disabled={submitting}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-white text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-60"
              >
                {editingId ? <FiSave /> : <FiPlus />}
                {editingId ? "Save changes" : "Add ledger"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <FiX />
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </motion.section>

        <motion.section
          className="rounded-3xl border border-amber-100 bg-white/95 p-0 shadow-lg backdrop-blur"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <header className="flex items-center justify-between border-b border-amber-100 px-4 py-3 text-sm text-slate-600">
            <span>
              {loading
                ? "Loading ledger names..."
                : `${ledgerNames.length} ledger names`}
            </span>
            <button
              type="button"
              onClick={loadLedgerNames}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50"
            >
              <FiRefreshCw />
              Refresh
            </button>
          </header>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FiRefreshCw className="animate-spin text-lg" />
              </div>
            ) : ledgerNames.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No ledger names found. Add one above to get started.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-amber-50 text-sm text-slate-700">
                <tbody>
                  {ledgerNames.map((entry, index) => (
                    <tr
                      key={entry._id}
                      className="border-b border-amber-50 last:border-none"
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 w-16">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {entry.name}
                        </div>
                        <p className="text-xs text-slate-500">
                          Updated {formatTimestamp(entry)}
                        </p>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(entry)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            disabled={submitting && editingId !== entry._id}
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmState({
                                open: true,
                                targetId: entry._id,
                                targetName: entry.name,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            disabled={submitting}
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
        title="Delete ledger name?"
        message={`Are you sure you want to delete "${confirmState.targetName}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() =>
          setConfirmState({ open: false, targetId: null, targetName: "" })
        }
        onConfirm={() => {
          const { targetId, targetName } = confirmState;
          setConfirmState({ open: false, targetId: null, targetName: "" });
          if (targetId) {
            handleDeleteLedger(targetId, targetName);
          }
        }}
      />
    </motion.main>
  );
};

export default LedgerNameManager;

