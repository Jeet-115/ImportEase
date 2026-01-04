import {
  create as createSalesParty,
  deleteById as deleteSalesPartyById,
  findAll as findAllSalesParties,
  findByCompany as findSalesPartiesByCompany,
  findById as findSalesPartyById,
  updateById as updateSalesPartyById,
} from "../models/salespartymastermodel.js";
import { findById as findCompanyById } from "../models/companymastermodel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("SalesPartyMasterController Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getSalesPartyMasters = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  console.log("[SalesParty] GET - companyId received:", companyId);
  
  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Validate company exists
  const company = await findCompanyById(companyId);
  console.log("[SalesParty] Company found:", company ? "Yes" : "No");
  
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  const parties = await findSalesPartiesByCompany(companyId);
  console.log("[SalesParty] Found", parties.length, "parties");
  return res.json(parties);
});

export const getSalesPartyMasterById = asyncHandler(async (req, res) => {
  const party = await findSalesPartyById(req.params.id);
  if (!party) {
    return res.status(404).json({ message: "Sales party master not found" });
  }
  return res.json(party);
});

export const createSalesPartyMaster = asyncHandler(async (req, res) => {
  const companyId = req.params.companyId; // Get from URL params
  const partyData = req.body;
  
  console.log("[SalesParty] POST - companyId received:", companyId);
  console.log("[SalesParty] POST - partyData:", JSON.stringify(partyData));

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  // Validate company exists
  const company = await findCompanyById(companyId);
  console.log("[SalesParty] Company found:", company ? "Yes" : "No");
  
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  if (!partyData.name || !partyData.name.trim()) {
    return res.status(400).json({ message: "name is required" });
  }

  // Normalize name
  const normalizedName = partyData.name.trim();

  // Check for duplicate name within the same company
  const existingParties = await findSalesPartiesByCompany(companyId);
  const existingParty = existingParties.find(
    (party) => party.name.trim().toLowerCase() === normalizedName.toLowerCase()
  );

  if (existingParty) {
    return res.status(400).json({
      message: "A party with this name already exists for this company.",
    });
  }

  // Clean up partyData - remove companyId if present in body and empty strings
  const { companyId: bodyCompanyId, ...cleanPartyData } = partyData;
  
  // Remove empty strings, null, and undefined values
  Object.keys(cleanPartyData).forEach((key) => {
    const value = cleanPartyData[key];
    if (value === "" || value === null || value === undefined) {
      delete cleanPartyData[key];
    } else if (key === "contact" && typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Clean contact object
      const cleanedContact = {};
      let hasAnyValue = false;
      Object.keys(value).forEach((contactKey) => {
        if (value[contactKey] !== "" && value[contactKey] !== null && value[contactKey] !== undefined) {
          cleanedContact[contactKey] = value[contactKey];
          hasAnyValue = true;
        }
      });
      if (hasAnyValue) {
        cleanPartyData[key] = cleanedContact;
      } else {
        delete cleanPartyData[key];
      }
    }
  });

  console.log("[SalesParty] Cleaned partyData:", JSON.stringify(cleanPartyData));

  const party = await createSalesParty({
    companyId,
    name: normalizedName,
    ...cleanPartyData,
  });

  console.log("[SalesParty] Created party:", party._id);
  return res.status(201).json(party);
});

export const updateSalesPartyMaster = asyncHandler(async (req, res) => {
  console.log("[SalesParty] PUT - id:", req.params.id);
  console.log("[SalesParty] PUT - updates:", JSON.stringify(req.body));
  
  const existingParty = await findSalesPartyById(req.params.id);
  if (!existingParty) {
    return res.status(404).json({ message: "Sales party master not found" });
  }

  const updates = { ...req.body };
  
  // Normalize name if provided
  if (updates.name) {
    updates.name = updates.name.trim();
    
    // Check for duplicate name (excluding current party)
    const existingParties = await findSalesPartiesByCompany(existingParty.companyId);
    const duplicateParty = existingParties.find(
      (party) =>
        party._id !== req.params.id &&
        party.name.trim().toLowerCase() === updates.name.toLowerCase()
    );

    if (duplicateParty) {
      return res.status(400).json({
        message: "A party with this name already exists for this company.",
      });
    }
  }

  // Remove companyId from updates if present (should not be changed)
  delete updates.companyId;

  // Clean up updates - remove empty strings
  Object.keys(updates).forEach((key) => {
    if (updates[key] === "" || updates[key] === null || updates[key] === undefined) {
      delete updates[key];
    } else if (key === "contact" && typeof updates[key] === "object" && updates[key] !== null && !Array.isArray(updates[key])) {
      // Clean contact object
      const cleanedContact = {};
      let hasAnyValue = false;
      Object.keys(updates[key]).forEach((contactKey) => {
        if (updates[key][contactKey] !== "" && updates[key][contactKey] !== null && updates[key][contactKey] !== undefined) {
          cleanedContact[contactKey] = updates[key][contactKey];
          hasAnyValue = true;
        }
      });
      if (hasAnyValue) {
        updates[key] = cleanedContact;
      } else {
        delete updates[key];
      }
    }
  });

  const updated = await updateSalesPartyById(req.params.id, updates);
  console.log("[SalesParty] Updated party:", updated._id);
  return res.json(updated);
});

export const deleteSalesPartyMaster = asyncHandler(async (req, res) => {
  console.log("[SalesParty] DELETE - id:", req.params.id);
  const deleted = await deleteSalesPartyById(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "Sales party master not found" });
  }
  console.log("[SalesParty] Deleted party:", req.params.id);
  return res.json({ message: "Sales party master deleted successfully" });
});
