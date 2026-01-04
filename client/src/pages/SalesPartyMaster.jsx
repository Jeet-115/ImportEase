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
  createSalesParty,
  deleteSalesParty,
  getSalesParties,
  updateSalesParty,
} from "../services/salesPartyService.js";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const initialFormState = {
  name: "",
  under: "Sundry Creditors",
  maintainBillByBill: false,
  defaultCreditPeriod: "",
  checkCreditDays: false,
  interestCalculation: false,
  isTdsDeductable: false,
  isTcsApplicable: false,
  mailingName: "",
  address: "",
  state: "",
  country: "",
  pincode: "",
  mobile: "",
  contact: {
    contactName: "",
    contactPhone: "",
    contactMobile: "",
    contactEmail: "",
  },
  pan: "",
  registrationType: "",
  gstin: "",
  additionalGstDetails: false,
  msme: false,
};

const SalesPartyMaster = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { user, isPlanRestricted } = useAuth();
  const [company, setCompany] = useState(null);
  const [parties, setParties] = useState([]);
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
      loadParties();
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

  const loadParties = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await getSalesParties(companyId);
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
        defaultCreditPeriod: formData.defaultCreditPeriod
          ? Number(formData.defaultCreditPeriod)
          : undefined,
        gstRate: formData.gstRate ? Number(formData.gstRate) : undefined,
      };

      if (editingId) {
        await updateSalesParty(editingId, payload);
        setStatus({ type: "success", message: "Party updated successfully." });
      } else {
        await createSalesParty(companyId, payload);
        setStatus({ type: "success", message: "Party created successfully." });
      }

      resetForm();
      await loadParties();
    } catch (error) {
      console.error("Failed to save party:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to save party. Please retry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (party) => {
    if (readOnly) {
      setStatus({ type: "error", message: readOnlyMessage });
      return;
    }
    setEditingId(party._id);
    setFormData({
      name: party.name || "",
      under: party.under || "Sundry Creditors",
      maintainBillByBill: party.maintainBillByBill || false,
      defaultCreditPeriod: party.defaultCreditPeriod || "",
      checkCreditDays: party.checkCreditDays || false,
      interestCalculation: party.interestCalculation || false,
      isTdsDeductable: party.isTdsDeductable || false,
      isTcsApplicable: party.isTcsApplicable || false,
      mailingName: party.mailingName || "",
      address: party.address || "",
      state: party.state || "",
      country: party.country || "",
      pincode: party.pincode || "",
      mobile: party.mobile || "",
      contact: {
        contactName: party.contact?.contactName || "",
        contactPhone: party.contact?.contactPhone || "",
        contactMobile: party.contact?.contactMobile || "",
        contactEmail: party.contact?.contactEmail || "",
      },
      pan: party.pan || "",
      registrationType: party.registrationType || "",
      gstin: party.gstin || "",
      additionalGstDetails: party.additionalGstDetails || false,
      msme: party.msme || false,
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
      await deleteSalesParty(id);
      setStatus({ type: "success", message: "Party deleted successfully." });
      await loadParties();
    } catch (error) {
      console.error("Failed to delete party:", error);
      setStatus({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Unable to delete party. Please retry.",
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

  const filteredParties = parties.filter((party) =>
    party.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!companyId) {
    return (
      <motion.main
        className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-4 sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <section className="mx-auto max-w-5xl">
          <BackButton label="Back to Sales Home" fallback="/sales" />
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
            Sales Party Master
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "Loading..."}
          </h1>
          <p className="text-sm text-slate-600">
            Manage sales party masters for this company. All fields except Name
            are optional.
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
            Add New Sales Party
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
                {editingId ? "Edit Sales Party" : "Create Sales Party"}
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
                    <input
                      type="text"
                      value={formData.under}
                      onChange={(e) =>
                        setFormData({ ...formData, under: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Default Credit Period (days)
                    <input
                      type="number"
                      value={formData.defaultCreditPeriod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultCreditPeriod: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.maintainBillByBill}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maintainBillByBill: e.target.checked,
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    Maintain Bill by Bill
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.checkCreditDays}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          checkCreditDays: e.target.checked,
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    Check Credit Days
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
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
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.isTdsDeductable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isTdsDeductable: e.target.checked,
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    TDS Deductable
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.isTcsApplicable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isTcsApplicable: e.target.checked,
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    TCS Applicable
                  </label>
                </div>
              </div>

              {/* Mailing */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Mailing
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Mailing Name
                    <input
                      type="text"
                      value={formData.mailingName}
                      onChange={(e) =>
                        setFormData({ ...formData, mailingName: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Mobile
                    <input
                      type="text"
                      value={formData.mobile}
                      onChange={(e) =>
                        setFormData({ ...formData, mobile: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700 sm:col-span-2">
                    Address
                    <textarea
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows={2}
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    State
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Country
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Pincode
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({ ...formData, pincode: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Contact
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Contact Name
                    <input
                      type="text"
                      value={formData.contact.contactName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact: {
                            ...formData.contact,
                            contactName: e.target.value,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Contact Phone
                    <input
                      type="text"
                      value={formData.contact.contactPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact: {
                            ...formData.contact,
                            contactPhone: e.target.value,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Contact Mobile
                    <input
                      type="text"
                      value={formData.contact.contactMobile}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact: {
                            ...formData.contact,
                            contactMobile: e.target.value,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Contact Email
                    <input
                      type="email"
                      value={formData.contact.contactEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contact: {
                            ...formData.contact,
                            contactEmail: e.target.value,
                          },
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                </div>
              </div>

              {/* Tax */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Tax
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    PAN
                    <input
                      type="text"
                      value={formData.pan}
                      onChange={(e) =>
                        setFormData({ ...formData, pan: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Registration Type
                    <select
                      value={formData.registrationType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registrationType: e.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    >
                      <option value="">Select...</option>
                      <option value="composition">Composition</option>
                      <option value="regular">Regular</option>
                      <option value="unregistered">Unregistered</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-700">
                    GSTIN
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) =>
                        setFormData({ ...formData, gstin: e.target.value })
                      }
                      className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.additionalGstDetails}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          additionalGstDetails: e.target.checked,
                        })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    Additional GST Details
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.msme}
                      onChange={(e) =>
                        setFormData({ ...formData, msme: e.target.checked })
                      }
                      className="rounded border-amber-200 text-amber-500 focus:ring-amber-100"
                      disabled={submitting || readOnly}
                    />
                    MSME
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
                  {editingId ? "Update Party" : "Create Party"}
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
                  placeholder="Search by party name..."
                  className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-4 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {loading
                  ? "Loading..."
                  : searchTerm
                  ? `${filteredParties.length} of ${parties.length} parties`
                  : `${parties.length} parties`}
              </span>
              <button
                type="button"
                onClick={loadParties}
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
            ) : filteredParties.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {searchTerm
                  ? "No parties match your search."
                  : "No parties found. Create one to get started."}
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
                      GSTIN
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                      Registration Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((party, index) => (
                    <tr
                      key={party._id}
                      className="border-b border-amber-50 last:border-none"
                    >
                      <td className="px-4 py-3 text-xs text-slate-400 w-16">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {party.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {party.gstin || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {party.registrationType || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleEdit(party)}
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
                                targetId: party._id,
                                targetName: party.name,
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
        title="Delete sales party?"
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

export default SalesPartyMaster;

