import axiosInstance from "../utils/axiosInstance";

/**
 * Fetches pending rows from previous months for carry-forward
 * @param {string} companyId - The company ID
 * @param {string} type - "GSTR2A" or "GSTR2B"
 * @param {string} currentProcessedId - Optional: ID of current processed file to exclude
 * @returns {Promise} Axios response with { pendingRows: [...] }
 */
export const fetchCarryForwardPending = (companyId, type, currentProcessedId = null) => {
  const params = {};
  if (currentProcessedId) {
    params.currentProcessedId = currentProcessedId;
  }
  
  return axiosInstance.get(`/api/carry-forward/${companyId}/${type}`, { params });
};

/**
 * Applies selected pending rows to the current month's processed file
 * @param {string} currentProcessedId - ID of current processed file
 * @param {Array} rowsToAdd - Array of row objects to add
 * @param {string} type - "GSTR2A" or "GSTR2B"
 * @returns {Promise} Axios response with updated processed file
 */
export const applyCarryForward = (currentProcessedId, rowsToAdd, type) => {
  return axiosInstance.post("/api/carry-forward/apply", {
    currentProcessedId,
    rowsToAdd,
    type,
  });
};

