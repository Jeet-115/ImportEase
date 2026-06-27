

import { HashRouter, Navigate, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import CompanyHub from "./pages/CompanyHub.jsx";
import Companymasters from "./pages/Companymasters.jsx";
import CompanyProcessor from "./pages/CompanyProcessor.jsx";
import CompanyProcessorGstr2A from "./pages/CompanyProcessorGstr2A.jsx";
import B2BCompanyHistory from "./pages/B2BCompanyHistory.jsx";
import CompanyHistoryGstr2A from "./pages/CompanyHistoryGstr2A.jsx";
import LedgerNameManager from "./pages/LedgerNameManager.jsx";
import PartyMasterManager from "./pages/PartyMasterManager.jsx";
import Comparisons from "./pages/Comparisons.jsx";
import SalesDataProcessor from "./pages/SalesDataProcessor.jsx";
import SalesDataHistory from "./pages/SalesDataHistory.jsx";
import BackendStatusGate from "./components/BackendStatusGate.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

const AppShell = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <div className="login-card text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-teal-200 border-t-teal-600" />
          <h1 className="login-title">ImportEase</h1>
          <p className="login-subtitle">Loading your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/company-masters" element={<Companymasters />} />
          <Route path="/company/:companyId" element={<CompanyHub />} />
          <Route
            path="/company/:companyId/process-gstr2b"
            element={<CompanyProcessor />}
          />
          <Route
            path="/company/:companyId/process-gstr2a"
            element={<CompanyProcessorGstr2A />}
          />
          <Route
            path="/company/:companyId/history-gstr2b"
            element={<B2BCompanyHistory />}
          />
          <Route
            path="/company/:companyId/history-gstr2a"
            element={<CompanyHistoryGstr2A />}
          />
          <Route
            path="/company/:companyId/party-masters"
            element={<PartyMasterManager />}
          />
          <Route
            path="/company/:companyId/comparisons"
            element={<Comparisons />}
          />
          <Route
            path="/company/:companyId/process-sales-data"
            element={<SalesDataProcessor />}
          />
          <Route
            path="/company/:companyId/history-sales-data"
            element={<SalesDataHistory />}
          />
          <Route path="/ledger-names" element={<LedgerNameManager />} />

          {/* Legacy routes → client-first flow */}
          <Route path="/company-selector" element={<Navigate to="/" replace />} />
          <Route
            path="/company-selector-gstr2a"
            element={<Navigate to="/" replace />}
          />
          <Route path="/company-processor" element={<Navigate to="/" replace />} />
          <Route
            path="/company-processor-gstr2a"
            element={<Navigate to="/" replace />}
          />
          <Route path="/b2b-history" element={<Navigate to="/" replace />} />
          <Route
            path="/b2b-history/:companyId"
            element={<Navigate to="/" replace />}
          />
          <Route path="/gstr2a-history" element={<Navigate to="/" replace />} />
          <Route
            path="/gstr2a-history/:companyId"
            element={<Navigate to="/" replace />}
          />
          <Route path="/party-masters" element={<Navigate to="/" replace />} />
          <Route path="/comparisons" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

const App = () => (
  <AuthProvider>
    <BackendStatusGate>
      <AppShell />
    </BackendStatusGate>
  </AuthProvider>
);

export default App;
