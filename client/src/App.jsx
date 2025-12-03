

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Companymasters from "./pages/Companymasters.jsx";
import Companyselector from "./pages/Companyselector.jsx";
import CompanyProcessor from "./pages/CompanyProcessor.jsx";
import B2BHistory from "./pages/B2BHistory.jsx";
import B2BCompanyHistory from "./pages/B2BCompanyHistory.jsx";
import LedgerNameManager from "./pages/LedgerNameManager.jsx";
import PartyMasterManager from "./pages/PartyMasterManager.jsx";
import BackendStatusGate from "./components/BackendStatusGate.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import MasterBadge from "./components/MasterBadge.jsx";

const AppShell = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1 className="login-title">ImportEase</h1>
          <p className="login-subtitle">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <>
      <MasterBadge />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/company-masters" element={<Companymasters />} />
          <Route path="/company-selector" element={<Companyselector />} />
          <Route path="/company-processor" element={<CompanyProcessor />} />
          <Route path="/b2b-history" element={<B2BHistory />} />
          <Route
            path="/b2b-history/:companyId"
            element={<B2BCompanyHistory />}
          />
          <Route path="/ledger-names" element={<LedgerNameManager />} />
          <Route path="/party-masters" element={<PartyMasterManager />} />
        </Routes>
      </BrowserRouter>
    </>
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
