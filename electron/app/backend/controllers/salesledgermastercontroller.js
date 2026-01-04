import {
  create as createSalesLedger,
  deleteById as deleteSalesLedgerById,
  findAll as findAllSalesLedgers,
  findById as findSalesLedgerById,
  updateById as updateSalesLedgerById,
} from "../models/salesledgermastermodel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("SalesLedgerMasterController Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getSalesLedgerMasters = asyncHandler(async (req, res) => {
  console.log("[SalesLedger] GET - Fetching all ledgers");
  const ledgers = await findAllSalesLedgers();
  const sorted = [...ledgers].sort((a, b) =>
    (a?.name || "").localeCompare(b?.name || "", undefined, {
      sensitivity: "base",
    })
  );
  console.log("[SalesLedger] Found", sorted.length, "ledgers");
  return res.json(sorted);
});

export const getSalesLedgerMasterById = asyncHandler(async (req, res) => {
  const ledger = await findSalesLedgerById(req.params.id);
  if (!ledger) {
    return res.status(404).json({ message: "Sales ledger master not found" });
  }
  return res.json(ledger);
});

export const createSalesLedgerMaster = asyncHandler(async (req, res) => {
  const ledgerData = req.body;
  console.log("[SalesLedger] POST - ledgerData:", JSON.stringify(ledgerData));

  if (!ledgerData.name || !ledgerData.name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  // Normalize name
  const normalizedName = ledgerData.name.trim();

  // Check for duplicate name
  const existingLedgers = await findAllSalesLedgers();
  const existingLedger = existingLedgers.find(
    (ledger) => ledger.name.trim().toLowerCase() === normalizedName.toLowerCase()
  );

  if (existingLedger) {
    return res.status(400).json({
      message: "A ledger with this name already exists.",
    });
  }

  // Clean up data - remove empty strings and undefined values
  const cleanData = { ...ledgerData };
  Object.keys(cleanData).forEach((key) => {
    if (cleanData[key] === "" || cleanData[key] === null || cleanData[key] === undefined) {
      delete cleanData[key];
    }
  });

  const ledger = await createSalesLedger({
    name: normalizedName,
    ...cleanData,
  });

  console.log("[SalesLedger] Created ledger:", ledger._id);
  return res.status(201).json(ledger);
});

export const updateSalesLedgerMaster = asyncHandler(async (req, res) => {
  console.log("[SalesLedger] PUT - id:", req.params.id);
  console.log("[SalesLedger] PUT - updates:", JSON.stringify(req.body));
  
  const existingLedger = await findSalesLedgerById(req.params.id);
  if (!existingLedger) {
    return res.status(404).json({ message: "Sales ledger master not found" });
  }

  const updates = { ...req.body };

  // Normalize name if provided
  if (updates.name) {
    updates.name = updates.name.trim();

    // Check for duplicate name (excluding current ledger)
    const allLedgers = await findAllSalesLedgers();
    const duplicateLedger = allLedgers.find(
      (ledger) =>
        ledger._id !== req.params.id &&
        ledger.name.trim().toLowerCase() === updates.name.toLowerCase()
    );

    if (duplicateLedger) {
      return res.status(400).json({
        message: "A ledger with this name already exists.",
      });
    }
  }

  // Clean up updates - remove empty strings
  Object.keys(updates).forEach((key) => {
    if (updates[key] === "" || updates[key] === null || updates[key] === undefined) {
      delete updates[key];
    }
  });

  const updated = await updateSalesLedgerById(req.params.id, updates);
  console.log("[SalesLedger] Updated ledger:", updated._id);
  return res.json(updated);
});

export const deleteSalesLedgerMaster = asyncHandler(async (req, res) => {
  console.log("[SalesLedger] DELETE - id:", req.params.id);
  const deleted = await deleteSalesLedgerById(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Sales ledger master not found" });
  }
  console.log("[SalesLedger] Deleted ledger:", req.params.id);
  return res.json({ message: "Sales ledger master deleted successfully" });
});
