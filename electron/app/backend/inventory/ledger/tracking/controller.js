import {
  findAll,
  findByTrackingNo,
  findByStatus,
  create,
  update,
  closeTracking,
} from "./model.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("[TrackingController] Error:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
};

export const getAllTrackingNumbers = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { status } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  const trackings = status
    ? await findByStatus(companyId, status)
    : await findAll(companyId);

  return res.json(trackings || []);
});

export const getTrackingNumber = asyncHandler(async (req, res) => {
  const { companyId, trackingNo } = req.params;

  const tracking = await findByTrackingNo(companyId, trackingNo);
  if (!tracking) {
    return res.status(404).json({ message: "Tracking number not found" });
  }

  return res.json(tracking);
});

export const createTrackingNumber = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { trackingNo, sourceVoucher, targetVoucher } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: "companyId is required" });
  }

  if (!trackingNo || !sourceVoucher || !targetVoucher) {
    return res.status(400).json({ message: "trackingNo, sourceVoucher, and targetVoucher are required" });
  }

  // Check if tracking number already exists
  const existing = await findByTrackingNo(companyId, trackingNo);
  if (existing) {
    return res.status(400).json({ message: "Tracking number already exists" });
  }

  const tracking = await create(companyId, {
    trackingNo,
    sourceVoucher,
    targetVoucher,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json(tracking);
});

export const updateTrackingNumber = asyncHandler(async (req, res) => {
  const { companyId, trackingNo } = req.params;
  const updates = req.body;

  const existing = await findByTrackingNo(companyId, trackingNo);
  if (!existing) {
    return res.status(404).json({ message: "Tracking number not found" });
  }

  const updated = await update(companyId, trackingNo, updates);
  return res.json(updated);
});

export const closeTrackingNumber = asyncHandler(async (req, res) => {
  const { companyId, trackingNo } = req.params;

  const existing = await findByTrackingNo(companyId, trackingNo);
  if (!existing) {
    return res.status(404).json({ message: "Tracking number not found" });
  }

  const updated = await closeTracking(companyId, trackingNo);
  return res.json(updated);
});

