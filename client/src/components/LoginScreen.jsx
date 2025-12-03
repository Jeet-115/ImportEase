import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const LoginScreen = () => {
  const { login, locked, lockReason } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">ImportEase Login</h1>
        <p className="login-subtitle">
          Sign in with the email and password used on the ImportEase website.
        </p>

        {locked && (
          <div className="login-alert login-alert-error">
            {lockReason ||
              "Access is currently blocked. Please check your subscription or device lock."}
          </div>
        )}

        {error && (
          <div className="login-alert login-alert-error">{error}</div>
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
            />
          </label>

          <label className="login-label">
            Password
            <input
              type="password"
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="login-button"
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;


