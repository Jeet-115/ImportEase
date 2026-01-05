import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import companyMasterRoutes from "./routes/companymasterroutes.js";
import gstinNumberRoutes from "./routes/gstinnumberroutes.js";
import gstr2BImportRoutes from "./routes/gstr2bimportroutes.js";
import gstr2AImportRoutes from "./routes/gstr2aimportroutes.js";
import ledgerNameRoutes from "./routes/ledgernameroutes.js";
import partyMasterRoutes from "./routes/partymasterroutes.js";
import softwareAuthRoutes from "./routes/softwareAuthRoutes.js";
import carryForwardRoutes from "./routes/carryforwardroutes.js";
import salesPartyRoutes from "./routes/salespartyroutes.js";
import salesLedgerRoutes from "./routes/salesledgerroutes.js";
import unitsRoutes from "./inventory/units/routes.js";
import groupsRoutes from "./inventory/groups/routes.js";
import categoriesRoutes from "./inventory/categories/routes.js";
import godownsRoutes from "./inventory/godowns/routes.js";
import itemsRoutes from "./inventory/items/routes.js";
import featuresRoutes from "./inventory/features/routes.js";
import batchesRoutes from "./inventory/batches/routes.js";
import bomsRoutes from "./inventory/boms/routes.js";
import reorderRoutes from "./inventory/reorder/routes.js";
import pricingRoutes from "./inventory/pricing/routes.js";
import costTracksRoutes from "./inventory/costTracks/routes.js";
import jobOrdersRoutes from "./inventory/jobOrders/routes.js";
import materialMovementsRoutes from "./inventory/materialMovements/routes.js";
import jobworkReportsRoutes from "./inventory/jobwork/routes.js";
import inventoryTransactionsRoutes from "./inventory/ledger/transactions/routes.js";
import trackingRoutes from "./inventory/ledger/tracking/routes.js";
import receiptNotesRoutes from "./inventory/ledger/vouchers/receiptNotes/routes.js";
import deliveryNotesRoutes from "./inventory/ledger/vouchers/deliveryNotes/routes.js";
import purchasesRoutes from "./inventory/ledger/vouchers/purchases/routes.js";
import salesRoutes from "./inventory/ledger/vouchers/sales/routes.js";
import rejectionsInRoutes from "./inventory/ledger/vouchers/rejectionsIn/routes.js";
import rejectionsOutRoutes from "./inventory/ledger/vouchers/rejectionsOut/routes.js";
import stockJournalRoutes from "./inventory/ledger/vouchers/stockJournal/routes.js";
import manufacturingRoutes from "./inventory/ledger/vouchers/manufacturing/routes.js";
import materialInRoutes from "./inventory/ledger/vouchers/materialIn/routes.js";
import materialOutRoutes from "./inventory/ledger/vouchers/materialOut/routes.js";
import physicalStockRoutes from "./inventory/ledger/vouchers/physicalStock/routes.js";
import ledgerReportsRoutes from "./inventory/ledger/reports/routes.js";
import { initFileStore } from "./storage/fileStore.js";
import { ensureGSTINSeeded } from "./controllers/gstinnumbercontroller.js";
import { ensureLedgerNamesSeeded } from "./controllers/ledgernamecontroller.js";
import { connectDB } from "./config/db.js";
import { softwareAuthGuard } from "./middleware/softwareAuthMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env.production"),
});
const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://tallyhelper.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        // Allow no-origin (like health checks) and known origins
        callback(null, true);
      } else {
        console.warn("❌ CORS blocked for origin:", origin); // optional log
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

app.use(express.json());

// Public routes
app.get("/health", (req, res) => {
  console.log("🩺 Health check at:", new Date().toLocaleString());
  res.status(200).send("OK");
});

// Software login (no auth required)
app.use("/software", softwareAuthRoutes);

// Protected routes (require valid software token / device / subscription)
app.use("/api/company-master", softwareAuthGuard, companyMasterRoutes);
app.use("/api/gstin-numbers", softwareAuthGuard, gstinNumberRoutes);
app.use("/api/gstr2b-imports", softwareAuthGuard, gstr2BImportRoutes);
app.use("/api/gstr2a-imports", softwareAuthGuard, gstr2AImportRoutes);
app.use("/api/ledger-names", softwareAuthGuard, ledgerNameRoutes);
app.use("/api/party-masters", softwareAuthGuard, partyMasterRoutes);
app.use("/api/carry-forward", softwareAuthGuard, carryForwardRoutes);
app.use("/api/sales/party", softwareAuthGuard, salesPartyRoutes);
app.use("/api/sales/ledger", softwareAuthGuard, salesLedgerRoutes);
app.use("/api/inventory/:companyId/units", softwareAuthGuard, unitsRoutes);
app.use("/api/inventory/:companyId/groups", softwareAuthGuard, groupsRoutes);
app.use("/api/inventory/:companyId/categories", softwareAuthGuard, categoriesRoutes);
app.use("/api/inventory/:companyId/godowns", softwareAuthGuard, godownsRoutes);
app.use("/api/inventory/:companyId/items", softwareAuthGuard, itemsRoutes);
app.use("/api/inventory/:companyId/features", softwareAuthGuard, featuresRoutes);
app.use("/api/inventory/:companyId/batches", softwareAuthGuard, batchesRoutes);
app.use("/api/inventory/:companyId/boms", softwareAuthGuard, bomsRoutes);
app.use("/api/inventory/:companyId/reorder", softwareAuthGuard, reorderRoutes);
app.use("/api/inventory/:companyId/pricing", softwareAuthGuard, pricingRoutes);
app.use("/api/inventory/:companyId/cost-tracks", softwareAuthGuard, costTracksRoutes);
app.use("/api/inventory/:companyId/job-orders", softwareAuthGuard, jobOrdersRoutes);
app.use("/api/inventory/:companyId/material-movements", softwareAuthGuard, materialMovementsRoutes);
app.use("/api/inventory/:companyId/jobwork", softwareAuthGuard, jobworkReportsRoutes);
// Inventory Ledger (Phase-3)
app.use("/api/inventory/:companyId/ledger/transactions", softwareAuthGuard, inventoryTransactionsRoutes);
app.use("/api/inventory/:companyId/ledger/tracking", softwareAuthGuard, trackingRoutes);
app.use("/api/inventory/:companyId/receipt-notes", softwareAuthGuard, receiptNotesRoutes);
app.use("/api/inventory/:companyId/delivery-notes", softwareAuthGuard, deliveryNotesRoutes);
app.use("/api/inventory/:companyId/purchases", softwareAuthGuard, purchasesRoutes);
app.use("/api/inventory/:companyId/sales-vouchers", softwareAuthGuard, salesRoutes);
app.use("/api/inventory/:companyId/rejections-in", softwareAuthGuard, rejectionsInRoutes);
app.use("/api/inventory/:companyId/rejections-out", softwareAuthGuard, rejectionsOutRoutes);
app.use("/api/inventory/:companyId/stock-journal", softwareAuthGuard, stockJournalRoutes);
app.use("/api/inventory/:companyId/manufacturing", softwareAuthGuard, manufacturingRoutes);
app.use("/api/inventory/:companyId/material-in", softwareAuthGuard, materialInRoutes);
app.use("/api/inventory/:companyId/material-out", softwareAuthGuard, materialOutRoutes);
app.use("/api/inventory/:companyId/physical-stock", softwareAuthGuard, physicalStockRoutes);
app.use("/api/inventory/:companyId/ledger/reports", softwareAuthGuard, ledgerReportsRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const bootstrap = async () => {
  await connectDB();
  await initFileStore();
  await ensureGSTINSeeded();
  await ensureLedgerNamesSeeded();

  const PORT = 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

// -------------------------------
// EXPORT for production (electron import)
// -------------------------------
export default async function startServer() {
  try {
    await bootstrap();
  } catch (error) {
    console.error("Failed to start backend:", error);
  }
}

// -------------------------------
// AUTO-RUN when executed directly (development spawn)
// -------------------------------
if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  startServer();
}
