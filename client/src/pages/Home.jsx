import { motion } from "framer-motion";
import {
  FiClipboard,
  FiCornerDownRight,
  FiLayers,
  FiSettings,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-white p-6 text-slate-900 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.section
        className="w-full max-w-4xl rounded-3xl bg-white/90 shadow-lg border border-amber-100 p-8 space-y-6 text-center backdrop-blur"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <p className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-amber-700">
          <FiCornerDownRight />
          Guided workflow
        </p>
        <h1 className="text-4xl font-bold text-slate-900">
          Tally Helper, simplified for everyone
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto">
          Upload GST data, create polished purchase registers, and keep every
          company record in-sync. Built with clear instructions so even
          non-technical teammates feel confident.
        </p>
        <div className="grid gap-4 sm:grid-cols-3 text-left">
          {[
            {
              icon: <FiSettings />,
              title: "Company Masters",
              text: "Stay on top of addresses, GSTINs, and contacts.",
              action: () => navigate("/company-masters"),
            },
            {
              icon: <FiLayers />,
              title: "Select & Process",
              text: "Pick a company and transform your GSTR-2B.",
              action: () => navigate("/company-selector"),
            },
            {
              icon: <FiClipboard />,
              title: "Review History",
              text: "Download past imports or mismatched rows.",
              action: () => navigate("/b2b-history"),
            },
          ].map(({ icon, title, text, action }) => (
            <button
              key={title}
              onClick={action}
              className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-amber-600 text-xl">
                {icon}
                <span className="text-base font-semibold text-slate-900">
                  {title}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </button>
          ))}
        </div>
      </motion.section>
    </motion.main>
  );
};

export default Home;

