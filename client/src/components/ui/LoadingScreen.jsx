import { motion } from "framer-motion";

const LoadingScreen = ({ message = "Loading…" }) => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
    <motion.div
      className="h-10 w-10 rounded-full border-2 border-teal-200 border-t-teal-600"
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
    <p className="text-sm font-medium text-slate-500">{message}</p>
  </div>
);

export default LoadingScreen;
