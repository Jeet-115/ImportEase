import {
  readTrackingNumbers,
  appendTrackingNumber,
  updateTrackingNumber,
} from "../../../storage/inventoryLedgerStore.js";

export const findAll = async (companyId) =>
  readTrackingNumbers(companyId);

export const findByTrackingNo = async (companyId, trackingNo) => {
  const trackings = await findAll(companyId);
  return trackings.find((t) => t.trackingNo === trackingNo) || null;
};

export const findByStatus = async (companyId, status) => {
  const trackings = await findAll(companyId);
  return trackings.filter((t) => t.status === status);
};

export const create = async (companyId, payload) => {
  const tracking = await appendTrackingNumber(companyId, payload);
  const trackings = await findAll(companyId);
  return trackings[trackings.length - 1];
};

export const update = async (companyId, trackingNo, updates) =>
  updateTrackingNumber(companyId, trackingNo, updates);

export const closeTracking = async (companyId, trackingNo) =>
  updateTrackingNumber(companyId, trackingNo, { status: "CLOSED" });

