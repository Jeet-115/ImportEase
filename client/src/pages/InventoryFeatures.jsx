import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiSave, FiRefreshCw, FiSettings } from "react-icons/fi";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";
import {
  getInventoryFeatures,
  updateInventoryFeatures,
} from "../services/inventoryService.js";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const InventoryFeatures = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, isPlanRestricted } = useAuth();
  const [company, setCompany] = useState(null);
  const [features, setFeatures] = useState({
    enableBatchTracking: false,
    enableExpiry: false,
    enableBOM: false,
    enableReorder: false,
    enablePriceLevels: false,
    enableCostTracking: false,
    enableJobWork: false,
    enableMaterialInOut: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const readOnly = !user?.isMaster && isPlanRestricted;
  const readOnlyMessage = readOnly
    ? getPlanRestrictionMessage(user?.planStatus)
    : "";

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadFeatures();
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

  const loadFeatures = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await getInventoryFeatures(companyId);
      setFeatures(data || {});
    } catch (error) {
      console.error("Failed to load features:", error);
      setStatus({
        type: "error",
        message: "Unable to load features. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureChange = (featureName, value) => {
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }

    const updated = { ...features, [featureName]: value };

    // Rule: If enableJobWork is true, force enableMaterialInOut to true
    if (featureName === "enableJobWork" && value === true) {
      updated.enableMaterialInOut = true;
    }

    setFeatures(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }

    setSubmitting(true);
    try {
      await updateInventoryFeatures(companyId, features);
      setStatus({ type: "success", message: "Features updated successfully." });
      await loadFeatures();
    } catch (error) {
      console.error("Failed to update features:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to update features. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!companyId) {
    return (
      <motion.main
        className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white p-4 sm:p-6"
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
      className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white p-4 sm:p-6"
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
          className="rounded-3xl border border-blue-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-3">
            <FiSettings className="text-2xl text-blue-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                Inventory Features
              </p>
              <h1 className="text-3xl font-bold text-slate-900">
                {company?.companyName || "Loading..."}
              </h1>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Configure global inventory features and capabilities for this company.
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
            className="rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-lg backdrop-blur space-y-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Core Features
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enableBatchTracking}
                      onChange={(e) =>
                        handleFeatureChange("enableBatchTracking", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Batch Tracking
                      </div>
                      <div className="text-xs text-slate-600">
                        Track inventory by batch numbers
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enableExpiry}
                      onChange={(e) =>
                        handleFeatureChange("enableExpiry", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Expiry Tracking
                      </div>
                      <div className="text-xs text-slate-600">
                        Track expiry dates for batches
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enableBOM}
                      onChange={(e) =>
                        handleFeatureChange("enableBOM", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Bill of Materials
                      </div>
                      <div className="text-xs text-slate-600">
                        Enable BOM for manufacturing
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enableReorder}
                      onChange={(e) =>
                        handleFeatureChange("enableReorder", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Reorder Alerts
                      </div>
                      <div className="text-xs text-slate-600">
                        Generate reorder level alerts
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enablePriceLevels}
                      onChange={(e) =>
                        handleFeatureChange("enablePriceLevels", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Price Levels
                      </div>
                      <div className="text-xs text-slate-600">
                        Multiple price levels per item
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enableCostTracking}
                      onChange={(e) =>
                        handleFeatureChange("enableCostTracking", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Cost Tracking
                      </div>
                      <div className="text-xs text-slate-600">
                        Track costs per item/party
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enableJobWork}
                      onChange={(e) =>
                        handleFeatureChange("enableJobWork", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Job Work
                      </div>
                      <div className="text-xs text-slate-600">
                        Enable job work orders
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={features.enableMaterialInOut}
                      onChange={(e) =>
                        handleFeatureChange("enableMaterialInOut", e.target.checked)
                      }
                      className="rounded border-blue-200 text-blue-500 focus:ring-blue-100"
                      disabled={submitting || readOnly || features.enableJobWork}
                    />
                    <div>
                      <div className="font-semibold text-slate-900">
                        Material In/Out
                      </div>
                      <div className="text-xs text-slate-600">
                        Material movement tracking
                        {features.enableJobWork && (
                          <span className="block text-blue-600 font-medium mt-1">
                            (Auto-enabled with Job Work)
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-blue-100">
                <button
                  type="submit"
                  disabled={submitting || readOnly}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-white text-sm font-semibold shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  <FiSave />
                  Save Features
                </button>
                <button
                  type="button"
                  onClick={loadFeatures}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  disabled={submitting}
                >
                  <FiRefreshCw />
                  Reset
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </section>
    </motion.main>
  );
};

export default InventoryFeatures;

