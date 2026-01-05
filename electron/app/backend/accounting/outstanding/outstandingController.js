import {
  findAll,
  findByParty,
  findByVoucher,
  updateBalance,
  getPartyOutstandingSummary,
} from "./outstandingModel.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[OutstandingController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAll = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const outstanding = await findAll(companyId);
  res.json(outstanding);
});

export const getByParty = asyncHandler(async (req, res) => {
  const { companyId, partyId } = req.params;
  const outstanding = await findByParty(companyId, partyId);
  res.json(outstanding);
});

export const getPartySummary = asyncHandler(async (req, res) => {
  const { companyId, partyId } = req.params;
  const summary = await getPartyOutstandingSummary(companyId, partyId);
  res.json(summary);
});

export const adjustOutstanding = asyncHandler(async (req, res) => {
  const { companyId, voucherId } = req.params;
  const { amount, isCredit } = req.body;

  if (amount === undefined) {
    return res.status(400).json({ message: "amount is required" });
  }

  const bill = await findByVoucher(companyId, voucherId);
  if (!bill) {
    return res.status(404).json({ message: "Outstanding bill not found" });
  }

  const updated = await updateBalance(companyId, voucherId, amount, isCredit);
  res.json(updated);
});


