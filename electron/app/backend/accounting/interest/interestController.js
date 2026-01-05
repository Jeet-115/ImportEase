import { runInterestCalculation, postInterest } from "./interestEngine.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[InterestController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const runInterest = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { asOfDate } = req.query;
  const entries = await runInterestCalculation(companyId, asOfDate);
  res.json({ count: entries.length, entries });
});

export const postInterestEntry = asyncHandler(async (req, res) => {
  const { companyId, interestVoucherId } = req.params;
  const { postAsDebitNote = true } = req.body;
  const note = await postInterest(companyId, interestVoucherId, postAsDebitNote);
  res.json(note);
});


