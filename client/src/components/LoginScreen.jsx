import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import logo from "/logo.png";

const LoginScreen = () => {
  const { login, locked, lockReason } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const errorMessage = err.message || "Email and password don't match";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.main
      className="login-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="login-card"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.4, ease: [0.17, 0.67, 0.83, 0.67] }}
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <motion.img
            src={logo}
            alt="ImportEase"
            className="h-14 w-14 rounded-2xl shadow-md ring-1 ring-slate-200"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          />
          <div>
            <p className="ie-eyebrow text-center">CA workspace</p>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">
              Sign in to process GSTR-2B &amp; GSTR-2A, map purchase ledgers, and
              export Tally-ready registers — locally on your machine.
            </p>
          </div>
        </div>

        {locked && (
          <div className="login-alert login-alert-error">
            <p className="font-semibold">
              {lockReason || "Access is currently blocked."}
            </p>
          </div>
        )}

        {error && !locked && (
          <div className="login-alert login-alert-error">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label">
            Email
            <input
              type="email"
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@firm.com"
            />
          </label>

          <label className="login-label">
            Password
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="login-input pr-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="ie-stat-chip text-[10px]">GST compliant flow</span>
          <span className="ie-stat-chip ie-stat-chip--tech text-[10px]">
            Local &amp; secure
          </span>
        </div>
      </motion.div>
    </motion.main>
  );
};

export default LoginScreen;
