import * as partyModel from "./partyModel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[PartyController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAll = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const parties = await partyModel.findAll(companyId);
  res.json(parties);
});

export const getById = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const party = await partyModel.findById(companyId, id);
  if (!party) {
    return res.status(404).json({ message: "Party not found" });
  }
  res.json(party);
});

export const create = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const party = await partyModel.create(companyId, req.body);
  res.status(201).json(party);
});

export const update = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const party = await partyModel.updateById(companyId, id, req.body);
  if (!party) {
    return res.status(404).json({ message: "Party not found" });
  }
  res.json(party);
});

export const remove = asyncHandler(async (req, res) => {
  const { companyId, id } = req.params;
  const deleted = await partyModel.deleteById(companyId, id);
  if (!deleted) {
    return res.status(404).json({ message: "Party not found" });
  }
  res.json({ success: true });
});

