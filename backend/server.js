import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import companyMasterRoutes from "./routes/companymasterroutes.js";
import gstinNumberRoutes from "./routes/gstinnumberroutes.js";
import gstr2BImportRoutes from "./routes/gstr2bimportroutes.js";
import ledgerNameRoutes from "./routes/ledgernameroutes.js";
import partyMasterRoutes from "./routes/partymasterroutes.js";
import softwareAuthRoutes from "./routes/softwareAuthRoutes.js";
import { initFileStore } from "./storage/fileStore.js";
import { ensureGSTINSeeded } from "./controllers/gstinnumbercontroller.js";
import { ensureLedgerNamesSeeded } from "./controllers/ledgernamecontroller.js";
import { connectDB } from "./config/db.js";
import { softwareAuthGuard } from "./middleware/softwareAuthMiddleware.js";

dotenv.config();
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
app.use("/api/ledger-names", softwareAuthGuard, ledgerNameRoutes);
app.use("/api/party-masters", softwareAuthGuard, partyMasterRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("API is running...");
});

const bootstrap = async () => {
  await connectDB();
  await initFileStore();
  await ensureGSTINSeeded();
  await ensureLedgerNamesSeeded();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
