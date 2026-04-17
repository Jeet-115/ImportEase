import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FiRefreshCw, FiBarChart2 } from "react-icons/fi";
import { useParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getGstr1 } from "../services/accountingService.js";
import { fetchCompanyMasterById } from "../services/companymasterservices.js";

const SalesGstr1 = () => {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [gstr1Data, setGstr1Data] = useState(null);
  const [company, setCompany] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (companyId) {
      loadCompany();
      loadGstr1();
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
    }
  };

  const loadGstr1 = async () => {
    setLoading(true);
    try {
      const { data } = await getGstr1(companyId);
      setGstr1Data(data);
    } catch (error) {
      console.error("Failed to load GSTR-1:", error);
      // If endpoint doesn't exist, show empty state with message
      if (error.response?.status === 404) {
        setStatus({
          type: "error",
          message: "GSTR-1 endpoint not yet implemented. Generating from sales vouchers...",
        });
        setGstr1Data({ summary: [], details: [] });
      } else {
        setStatus({
          type: "error",
          message: "Unable to load GSTR-1 report. Please try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (v) =>
    v === null || v === undefined ? "—" : Number(v).toFixed(2);

  // If data is not in expected format, try to structure it
  const summary = gstr1Data?.summary || gstr1Data?.byRate || [];
  const details = gstr1Data?.details || gstr1Data?.byParty || [];

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-sky-50 via-emerald-50 to-white p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className="mx-auto max-w-6xl space-y-5">
        <BackButton label="Back to Sales Home" fallback={`/accounting/${companyId}/sales`} />
        <motion.header
          className="rounded-3xl border border-sky-100 bg-white/90 p-6 sm:p-8 shadow-lg backdrop-blur space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">
            GSTR-1 Report
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {company?.companyName || "GSTR-1"}
          </h1>
          <p className="text-base text-slate-600">
            Generate GSTR-1 report for sales
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
          className="rounded-3xl border border-sky-100 bg-white/95 p-4 sm:p-6 shadow-lg backdrop-blur space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiBarChart2 className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">GSTR-1 Summary</h2>
                <p className="text-xs text-slate-500">
                  Aggregate sales by GST rate
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadGstr1}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
            >
              <FiRefreshCw />
              Refresh
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FiRefreshCw className="animate-spin text-lg" />
              </div>
            ) : summary.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No sales data found for GSTR-1.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                <thead className="bg-sky-50/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      GST Rate
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Taxable Value
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      CGST
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      SGST
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      IGST
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Total Tax
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row, idx) => {
                    const cgst = row.cgst || row.cgstAmount || 0;
                    const sgst = row.sgst || row.sgstAmount || 0;
                    const igst = row.igst || row.igstAmount || 0;
                    const totalTax = cgst + sgst + igst;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-sky-50 last:border-none hover:bg-sky-50/40"
                      >
                        <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                          {row.gstRate || row.rate || "—"}%
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(row.taxableValue || row.taxable || 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(cgst)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(sgst)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(igst)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold">
                          ₹{formatNumber(totalTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.section>

        {details.length > 0 && (
          <motion.section
            className="rounded-3xl border border-sky-100 bg-white/95 p-4 sm:p-6 shadow-lg backdrop-blur space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <div className="flex items-center gap-3">
              <FiBarChart2 className="text-sky-500 text-xl" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Party-wise Details</h2>
                <p className="text-xs text-slate-500">
                  Sales by party GSTIN
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-sky-50 text-sm text-slate-700">
                <thead className="bg-sky-50/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Party GSTIN
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                      Party Name
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Taxable Value
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      CGST
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      SGST
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      IGST
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Total Tax
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, idx) => {
                    const cgst = row.cgst || row.cgstAmount || 0;
                    const sgst = row.sgst || row.sgstAmount || 0;
                    const igst = row.igst || row.igstAmount || 0;
                    const totalTax = cgst + sgst + igst;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-sky-50 last:border-none hover:bg-sky-50/40"
                      >
                        <td className="px-3 py-2 text-xs font-mono text-slate-700">
                          {row.partyGstin || row.gstin || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-700">
                          {row.partyName || "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(row.taxableValue || row.taxable || 0)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(cgst)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(sgst)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          ₹{formatNumber(igst)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold">
                          ₹{formatNumber(totalTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}
      </section>
    </motion.main>
  );
};

export default SalesGstr1;
