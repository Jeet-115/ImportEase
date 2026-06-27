import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiRefreshCcw, FiSave, FiTrash2 } from "react-icons/fi";
import BackButton from "../components/BackButton";
import ConfirmDialog from "../components/ConfirmDialog";
import PageHeader from "../components/ui/PageHeader.jsx";
import {
  fetchCompanyMasters,
  createCompanyMaster,
  updateCompanyMaster,
  deleteCompanyMaster,
} from "../services/companymasterservices";
import { useAuth } from "../context/AuthContext.jsx";
import PlanRestrictionBanner from "../components/PlanRestrictionBanner.jsx";
import { getPlanRestrictionMessage } from "../utils/planAccess.js";

const initialFormState = {
  companyName: "",
  mailingName: "",
  address: "",
  state: "",
  country: "",
  pincode: "",
  telephone: "",
  mobile: "",
  email: "",
  tanNumber: "",
  gstin: "",
};

const Companymasters = () => {
  const { user, isPlanRestricted } = useAuth();
  const location = useLocation();
  const [formData, setFormData] = useState(initialFormState);
  const [companies, setCompanies] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const formTitle = useMemo(
    () => (selectedId ? "Update Company Master" : "Create Company Master"),
    [selectedId]
  );

  const readOnly = !user?.isMaster && isPlanRestricted;
  const readOnlyMessage = readOnly
    ? getPlanRestrictionMessage(user?.planStatus)
    : "";

  const setAlert = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: "", message: "" }), 3500);
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await fetchCompanyMasters();
      setCompanies(data || []);
    } catch (error) {
      console.error("Failed to load company masters:", error);
      setAlert("error", error?.response?.data?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    const editCompanyId = location.state?.editCompanyId;
    if (!editCompanyId || companies.length === 0) return;
    const company = companies.find((item) => item._id === editCompanyId);
    if (!company) return;
    setSelectedId(company._id);
    setFormData({
      companyName: company.companyName || "",
      mailingName: company.mailingName || "",
      address: company.address || "",
      state: company.state || "",
      country: company.country || "",
      pincode: company.pincode || "",
      telephone: company.telephone || "",
      mobile: company.mobile || "",
      email: company.email || "",
      tanNumber: company.tanNumber || "",
      gstin: company.gstin || "",
    });
  }, [location.state?.editCompanyId, companies]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly) {
      setAlert("error", readOnlyMessage);
      return;
    }
    setSaving(true);
    try {
      if (selectedId) {
        await updateCompanyMaster(selectedId, formData);
        setAlert("success", "Company master updated successfully");
      } else {
        await createCompanyMaster(formData);
        setAlert("success", "Company master created successfully");
      }
      resetForm();
      await loadCompanies();
    } catch (error) {
      console.error("Failed to save company master:", error);
      setAlert(
        "error",
        error?.response?.data?.message || "Operation could not be completed"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (company) => {
    if (readOnly) {
      setAlert("error", readOnlyMessage);
      return;
    }
    setSelectedId(company._id);
    setFormData({
      companyName: company.companyName || "",
      mailingName: company.mailingName || "",
      address: company.address || "",
      state: company.state || "",
      country: company.country || "",
      pincode: company.pincode || "",
      telephone: company.telephone || "",
      mobile: company.mobile || "",
      email: company.email || "",
      tanNumber: company.tanNumber || "",
      gstin: company.gstin || "",
    });
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    if (readOnly) {
      setAlert("error", readOnlyMessage);
      setConfirmDeleteId(null);
      return;
    }
    try {
      await deleteCompanyMaster(confirmDeleteId);
      setAlert("success", "Company master deleted successfully");
      setConfirmDeleteId(null);
      if (selectedId === confirmDeleteId) {
        resetForm();
      }
      await loadCompanies();
    } catch (error) {
      console.error("Failed to delete company master:", error);
      setAlert(
        "error",
        error?.response?.data?.message || "Failed to delete company master"
      );
    }
  };

  const formFields = [
    { label: "Company Name", name: "companyName", required: true },
    { label: "Mailing Name", name: "mailingName" },
    { label: "Address", name: "address" },
    { label: "State", name: "state" },
    { label: "Country", name: "country" },
    { label: "Pincode", name: "pincode" },
    { label: "Telephone", name: "telephone" },
    { label: "Mobile", name: "mobile" },
    { label: "Email", name: "email", type: "email" },
    { label: "TAN Number", name: "tanNumber" },
    { label: "GSTIN/UIN", name: "gstin" },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
        <BackButton label="Back to clients" fallback="/" />
        <PageHeader
          eyebrow="Master data"
          title="Company masters"
          description="Fill only what you know; you can always come back and update the rest. These details flow into every processed Excel."
        />

        <PlanRestrictionBanner />

        {status.message ? (
          <div
            className={
              status.type === "success" ? "ie-alert-success" : "ie-alert-error"
            }
          >
            {status.message}
          </div>
        ) : null}

        <motion.section
          className="ie-card p-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">{formTitle}</h2>
            {selectedId ? (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-slate-500 underline"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmit}
          >
            {formFields.map(({ label, name, type = "text", required }) => (
              <label key={name} className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">
                  {label} {required ? "*" : ""}
                </span>
                <input
                  type={type}
                  name={name}
                  required={required}
                  value={formData[name]}
                  onChange={handleChange}
                  className="ie-input"
                  disabled={readOnly}
                />
              </label>
            ))}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving || readOnly}
                className="ie-btn-primary w-full disabled:opacity-70 inline-flex items-center justify-center gap-2"
              >
                <FiSave />
                {saving ? "Saving..." : selectedId ? "Update Company" : "Create Company"}
              </button>
            </div>
          </form>
        </motion.section>

        <motion.section
          className="ie-card p-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Existing Company Masters
            </h2>
            <button
              onClick={loadCompanies}
              disabled={loading}
              className="ie-btn-ghost disabled:opacity-50"
            >
              <FiRefreshCcw />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="ie-table-wrap">
            <table className="ie-table">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-3 py-2">Company Name</th>
                  <th className="px-3 py-2">Mailing Name</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">GSTIN / TAN</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.length ? (
                  companies.map((company) => (
                    <tr
                      key={company._id}
                      className="border-t border-slate-100 text-slate-700"
                    >
                      <td className="px-3 py-3 font-medium">
                        <div className="flex flex-col">
                          <span>{company.companyName}</span>
                          <span className="text-xs text-slate-500">
                            {company.address}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">{company.mailingName}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col text-xs">
                          <span>Tel: {company.telephone || "N/A"}</span>
                          <span>Mobile: {company.mobile || "N/A"}</span>
                          <span>Email: {company.email || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span>{company.state}</span>,{" "}
                        <span>{company.country}</span>
                        <div>Pincode: {company.pincode || "N/A"}</div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div>GSTIN: {company.gstin || "N/A"}</div>
                        <div>TAN: {company.tanNumber || "N/A"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-3 text-sm">
                          <button
                            className="text-teal-600 hover:text-teal-800 font-semibold"
                            onClick={() => handleEdit(company)}
                            disabled={readOnly}
                          >
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 font-semibold"
                            onClick={() => setConfirmDeleteId(company._id)}
                            disabled={readOnly}
                          >
                            <FiTrash2 />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      {loading
                        ? "Loading company masters..."
                        : "No company masters found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete Company Master"
        message="Are you sure you want to delete this company master? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </motion.div>
  );
};

export default Companymasters;

