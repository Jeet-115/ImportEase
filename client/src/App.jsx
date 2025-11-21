

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Companymasters from "./pages/Companymasters.jsx";
import Companyselector from "./pages/Companyselector.jsx";
import CompanyProcessor from "./pages/CompanyProcessor.jsx";
import B2BHistory from "./pages/B2BHistory.jsx";
import B2BCompanyHistory from "./pages/B2BCompanyHistory.jsx";
import LedgerNameManager from "./pages/LedgerNameManager.jsx";
import BackendStatusGate from "./components/BackendStatusGate.jsx";

const App = () => (
  <BackendStatusGate>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/company-masters" element={<Companymasters />} />
        <Route path="/company-selector" element={<Companyselector />} />
        <Route path="/company-processor" element={<CompanyProcessor />} />
        <Route path="/b2b-history" element={<B2BHistory />} />
        <Route path="/b2b-history/:companyId" element={<B2BCompanyHistory />} />
        <Route path="/ledger-names" element={<LedgerNameManager />} />
      </Routes>
    </BrowserRouter>
  </BackendStatusGate>
);

export default App;
