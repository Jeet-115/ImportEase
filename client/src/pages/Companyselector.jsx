import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiBriefcase, FiUsers } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import LoadingScreen from "../components/ui/LoadingScreen.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import { fetchCompanyMasters } from "../services/companymasterservices";

const Companyselector = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { data } = await fetchCompanyMasters();
        setCompanies(data || []);
      } catch (err) {
        console.error("Failed to load company masters:", err);
        setError("Unable to load companies. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const handleSelect = (company) => {
    navigate("/company-processor", { state: { company } });
  };

  if (loading) {
    return <LoadingScreen message="Loading companies…" />;
  }

  if (error) {
    return (
      <div className="ie-alert-error">{error}</div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
        <BackButton label="Back to dashboard" />
        <PageHeader
          eyebrow="GSTR-2B · Step 1"
          title="Choose the client"
          description="ImportEase uses this client's name, GSTIN, and state for the purchase register. Pick the client first, then upload their GSTR-2B Excel on the next screen."
        />

        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: {
              opacity: 1,
              y: 0,
              transition: { staggerChildren: 0.05 },
            },
          }}
        >
          {companies.map((company) => (
            <motion.button
              key={company._id}
              onClick={() => handleSelect(company)}
              className="ie-card ie-card-hover p-5 text-left"
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            >
              <div className="flex items-center gap-3 text-teal-600">
                <FiBriefcase />
                <span className="ie-eyebrow text-[10px]">
                  Company Name
                </span>
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {company.companyName}
              </h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                {company.address ? <p>{company.address}</p> : null}
                <p>
                  {company.state}, {company.country} - {company.pincode}
                </p>
                <p>GSTIN: {company.gstin || "—"}</p>
                <p className="inline-flex items-center gap-1 text-teal-600">
                  <FiUsers /> Contact: {company.email || "—"}
                </p>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {!companies.length ? (
          <p className="text-center text-slate-500">
            No companies found. Create one first.
          </p>
        ) : null}
    </motion.div>
  );
};

export default Companyselector;

