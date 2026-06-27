import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchCompanyMasterById } from "../services/companymasterservices";
import { companyHubPath } from "../utils/companyRoutes";

export const useCompanyFromRoute = () => {
  const { companyId } = useParams();
  const location = useLocation();
  const stateCompany = location.state?.company;

  const [company, setCompany] = useState(
    stateCompany?._id === companyId ? stateCompany : null,
  );
  const [loading, setLoading] = useState(Boolean(companyId) && !company);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyId) {
      setCompany(null);
      setLoading(false);
      setError("");
      return;
    }

    if (stateCompany?._id === companyId) {
      setCompany(stateCompany);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchCompanyMasterById(companyId)
      .then(({ data }) => {
        if (!cancelled) {
          setCompany(data || null);
          if (!data) setError("Client not found.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompany(null);
          setError("Unable to load client details.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, stateCompany]);

  return {
    company,
    companyId,
    loading,
    error,
    hubPath: companyId ? companyHubPath(companyId) : "/",
  };
};
