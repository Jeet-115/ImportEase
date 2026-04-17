

import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Companymasters from "./pages/Companymasters.jsx";
import Companyselector from "./pages/Companyselector.jsx";
import CompanyselectorGstr2A from "./pages/CompanyselectorGstr2A.jsx";
import CompanyProcessor from "./pages/CompanyProcessor.jsx";
import CompanyProcessorGstr2A from "./pages/CompanyProcessorGstr2A.jsx";
import B2BHistory from "./pages/B2BHistory.jsx";
import B2BCompanyHistory from "./pages/B2BCompanyHistory.jsx";
import Gstr2AHistory from "./pages/Gstr2AHistory.jsx";
import CompanyHistoryGstr2A from "./pages/CompanyHistoryGstr2A.jsx";
import LedgerNameManager from "./pages/LedgerNameManager.jsx";
import PartyMasterManager from "./pages/PartyMasterManager.jsx";
import Comparisons from "./pages/Comparisons.jsx";
import SalesHome from "./pages/SalesHome.jsx";
import SalesPartyMaster from "./pages/SalesPartyMaster.jsx";
import SalesLedgerMaster from "./pages/SalesLedgerMaster.jsx";
import InventoryHome from "./pages/InventoryHome.jsx";
import UnitsMaster from "./pages/UnitsMaster.jsx";
import StockGroups from "./pages/StockGroups.jsx";
import StockCategories from "./pages/StockCategories.jsx";
import Godowns from "./pages/Godowns.jsx";
import StockItems from "./pages/StockItems.jsx";
import InventoryFeatures from "./pages/InventoryFeatures.jsx";
import InventoryVoucher from "./pages/InventoryVoucher.jsx";
import StockSummaryValuation from "./pages/StockSummaryValuation.jsx";
import ItemValuation from "./pages/ItemValuation.jsx";
import ProfitReport from "./pages/ProfitReport.jsx";
import PurchaseHome from "./pages/PurchaseHome.jsx";
import PurchaseGst2B from "./pages/PurchaseGst2B.jsx";
import PurchaseWizard from "./pages/PurchaseWizard.jsx";
import PurchaseBills from "./pages/PurchaseBills.jsx";
import PurchaseOutstanding from "./pages/PurchaseOutstanding.jsx";
import PurchaseITC from "./pages/PurchaseITC.jsx";
import SalesWizard from "./pages/SalesWizard.jsx";
import SalesOrders from "./pages/SalesOrders.jsx";
import SalesOutstanding from "./pages/SalesOutstanding.jsx";
import SalesProfit from "./pages/SalesProfit.jsx";
import SalesGstr1 from "./pages/SalesGstr1.jsx";
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
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/company-masters" element={<Companymasters />} />
          <Route path="/company-selector" element={<Companyselector />} />
          <Route path="/company-selector-gstr2a" element={<CompanyselectorGstr2A />} />
          <Route path="/company-processor" element={<CompanyProcessor />} />
          <Route path="/company-processor-gstr2a" element={<CompanyProcessorGstr2A />} />
          <Route path="/b2b-history" element={<B2BHistory />} />
          <Route
            path="/b2b-history/:companyId"
            element={<B2BCompanyHistory />}
          />
          <Route path="/gstr2a-history" element={<Gstr2AHistory />} />
          <Route
            path="/gstr2a-history/:companyId"
            element={<CompanyHistoryGstr2A />}
          />
          <Route path="/ledger-names" element={<LedgerNameManager />} />
          <Route path="/party-masters" element={<PartyMasterManager />} />
          <Route path="/comparisons" element={<Comparisons />} />
          <Route path="/sales" element={<SalesHome />} />
          <Route path="/accounting/:companyId/sales" element={<SalesHome />} />
          <Route path="/sales/party-master/:companyId" element={<SalesPartyMaster />} />
          <Route path="/sales/ledger-master" element={<SalesLedgerMaster />} />
          <Route path="/purchase" element={<PurchaseHome />} />
          <Route path="/accounting/:companyId/purchase" element={<PurchaseHome />} />
          <Route path="/inventory" element={<InventoryHome />} />
          <Route path="/inventory/:companyId/units" element={<UnitsMaster />} />
          <Route path="/inventory/:companyId/groups" element={<StockGroups />} />
          <Route path="/inventory/:companyId/categories" element={<StockCategories />} />
          <Route path="/inventory/:companyId/godowns" element={<Godowns />} />
          <Route path="/inventory/:companyId/items" element={<StockItems />} />
          <Route path="/inventory/:companyId/features" element={<InventoryFeatures />} />
          <Route path="/inventory/:companyId/reorder-alerts" element={<InventoryFeatures />} />
          <Route path="/inventory/:companyId/price-lists" element={<InventoryFeatures />} />
          <Route path="/inventory/:companyId/cost-tracking" element={<InventoryFeatures />} />
          <Route path="/inventory/:companyId/job-work" element={<InventoryFeatures />} />
          <Route path="/inventory/:companyId/vouchers/:voucherType" element={<InventoryVoucher />} />
          {/* Phase-4 valuation & profit views */}
          <Route
            path="/inventory/:companyId/valuation/stock-summary"
            element={<StockSummaryValuation />}
          />
          <Route
            path="/inventory/:companyId/valuation/item/:itemId"
            element={<ItemValuation />}
          />
          <Route
            path="/inventory/:companyId/valuation/profit-report"
            element={<ProfitReport />}
          />
          {/* Backwards-compatible alias from Phase-3 navigation */}
          <Route
            path="/inventory/:companyId/reports/stock-summary"
            element={<StockSummaryValuation />}
          />
          {/* Phase-5: Accounting & Sales/Purchase Engine */}
          <Route path="/accounting/:companyId/sales" element={<SalesHome />} />
          <Route path="/accounting/:companyId/sales/wizard" element={<SalesWizard />} />
          <Route path="/accounting/:companyId/sales/orders" element={<SalesOrders />} />
          <Route path="/accounting/:companyId/sales/outstanding" element={<SalesOutstanding />} />
          <Route path="/accounting/:companyId/sales/profit" element={<SalesProfit />} />
          <Route path="/accounting/:companyId/sales/gstr1" element={<SalesGstr1 />} />
          <Route path="/accounting/:companyId/purchase" element={<PurchaseHome />} />
          <Route path="/accounting/:companyId/purchase/gst2b" element={<PurchaseGst2B />} />
          <Route path="/accounting/:companyId/purchase/wizard" element={<PurchaseWizard />} />
          <Route path="/accounting/:companyId/purchase/bills" element={<PurchaseBills />} />
          <Route path="/accounting/:companyId/purchase/outstanding" element={<PurchaseOutstanding />} />
          <Route path="/accounting/:companyId/purchase/itc" element={<PurchaseITC />} />
        </Routes>
      </HashRouter>
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
