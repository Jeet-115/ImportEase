import axiosInstance from "../utils/axiosInstance";

const getBaseUrl = (companyId, resource) =>
  `/api/inventory/${companyId}/${resource}`;

// Units
export const getUnits = (companyId) =>
  axiosInstance.get(getBaseUrl(companyId, "units"));

export const getSimpleUnits = (companyId) =>
  axiosInstance.get(`${getBaseUrl(companyId, "units")}/simple`);

export const getUnitById = (companyId, id) =>
  axiosInstance.get(`${getBaseUrl(companyId, "units")}/${id}`);

export const createUnit = (companyId, data) =>
  axiosInstance.post(getBaseUrl(companyId, "units"), data);

export const updateUnit = (companyId, id, data) =>
  axiosInstance.put(`${getBaseUrl(companyId, "units")}/${id}`, data);

export const deleteUnit = (companyId, id) =>
  axiosInstance.delete(`${getBaseUrl(companyId, "units")}/${id}`);

// Groups
export const getGroups = (companyId) =>
  axiosInstance.get(getBaseUrl(companyId, "groups"));

export const getGroupById = (companyId, id) =>
  axiosInstance.get(`${getBaseUrl(companyId, "groups")}/${id}`);

export const createGroup = (companyId, data) =>
  axiosInstance.post(getBaseUrl(companyId, "groups"), data);

export const updateGroup = (companyId, id, data) =>
  axiosInstance.put(`${getBaseUrl(companyId, "groups")}/${id}`, data);

export const deleteGroup = (companyId, id) =>
  axiosInstance.delete(`${getBaseUrl(companyId, "groups")}/${id}`);

// Categories
export const getCategories = (companyId) =>
  axiosInstance.get(getBaseUrl(companyId, "categories"));

export const getCategoryById = (companyId, id) =>
  axiosInstance.get(`${getBaseUrl(companyId, "categories")}/${id}`);

export const createCategory = (companyId, data) =>
  axiosInstance.post(getBaseUrl(companyId, "categories"), data);

export const updateCategory = (companyId, id, data) =>
  axiosInstance.put(`${getBaseUrl(companyId, "categories")}/${id}`, data);

export const deleteCategory = (companyId, id) =>
  axiosInstance.delete(`${getBaseUrl(companyId, "categories")}/${id}`);

// Godowns
export const getGodowns = (companyId) =>
  axiosInstance.get(getBaseUrl(companyId, "godowns"));

export const getGodownById = (companyId, id) =>
  axiosInstance.get(`${getBaseUrl(companyId, "godowns")}/${id}`);

export const createGodown = (companyId, data) =>
  axiosInstance.post(getBaseUrl(companyId, "godowns"), data);

export const updateGodown = (companyId, id, data) =>
  axiosInstance.put(`${getBaseUrl(companyId, "godowns")}/${id}`, data);

export const deleteGodown = (companyId, id) =>
  axiosInstance.delete(`${getBaseUrl(companyId, "godowns")}/${id}`);

// Items
export const getItems = (companyId) =>
  axiosInstance.get(getBaseUrl(companyId, "items"));

export const getItemById = (companyId, id) =>
  axiosInstance.get(`${getBaseUrl(companyId, "items")}/${id}`);

export const createItem = (companyId, data) =>
  axiosInstance.post(getBaseUrl(companyId, "items"), data);

export const updateItem = (companyId, id, data) =>
  axiosInstance.put(`${getBaseUrl(companyId, "items")}/${id}`, data);

export const deleteItem = (companyId, id) =>
  axiosInstance.delete(`${getBaseUrl(companyId, "items")}/${id}`);

// Features
export const getInventoryFeatures = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/features`);

export const updateInventoryFeatures = (companyId, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/features`, data);

// Batches
export const getBatches = (companyId, itemId) => {
  const url = `/api/inventory/${companyId}/batches`;
  return axiosInstance.get(url, { params: itemId ? { itemId } : {} });
};

export const getBatchById = (companyId, id) =>
  axiosInstance.get(`/api/inventory/${companyId}/batches/${id}`);

export const createBatch = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/batches`, data);

export const updateBatch = (companyId, id, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/batches/${id}`, data);

export const deleteBatch = (companyId, id) =>
  axiosInstance.delete(`/api/inventory/${companyId}/batches/${id}`);

// BOMs
export const getBOMs = (companyId, itemId, type) => {
  const url = `/api/inventory/${companyId}/boms`;
  return axiosInstance.get(url, { params: { itemId, type } });
};

export const getBOMById = (companyId, id) =>
  axiosInstance.get(`/api/inventory/${companyId}/boms/${id}`);

export const createBOM = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/boms`, data);

export const updateBOM = (companyId, id, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/boms/${id}`, data);

export const deleteBOM = (companyId, id) =>
  axiosInstance.delete(`/api/inventory/${companyId}/boms/${id}`);

// Reorder
export const getReorderAlerts = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/reorder/alerts`);

// Pricing
export const getPricing = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/pricing`);

export const updatePricing = (companyId, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/pricing`, data);

export const addPriceLevel = (companyId, levelName) =>
  axiosInstance.post(`/api/inventory/${companyId}/pricing/levels`, { levelName });

export const removePriceLevel = (companyId, levelName) =>
  axiosInstance.delete(`/api/inventory/${companyId}/pricing/levels`, { data: { levelName } });

export const setItemPrice = (companyId, itemId, level, rate) =>
  axiosInstance.post(`/api/inventory/${companyId}/pricing/prices`, { itemId, level, rate });

export const removeItemPrice = (companyId, itemId, level) =>
  axiosInstance.delete(`/api/inventory/${companyId}/pricing/prices`, { data: { itemId, level } });

// Cost Tracks
export const getCostTracks = (companyId, itemId, partyId, status) => {
  const url = `/api/inventory/${companyId}/cost-tracks`;
  return axiosInstance.get(url, { params: { itemId, partyId, status } });
};

export const getCostTrackById = (companyId, id) =>
  axiosInstance.get(`/api/inventory/${companyId}/cost-tracks/${id}`);

export const getCostSummary = (companyId, groupBy) =>
  axiosInstance.get(`/api/inventory/${companyId}/cost-tracks/summary`, { params: { groupBy } });

export const getCostTrackBreakup = (companyId, id) =>
  axiosInstance.get(`/api/inventory/${companyId}/cost-tracks/${id}/breakup`);

export const createCostTrack = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/cost-tracks`, data);

export const updateCostTrack = (companyId, id, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/cost-tracks/${id}`, data);

export const addMovementToTrack = (companyId, trackId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/cost-tracks/${trackId}/movements`, data);

export const closeCostTrack = (companyId, id) =>
  axiosInstance.post(`/api/inventory/${companyId}/cost-tracks/${id}/close`);

export const openCostTrack = (companyId, id) =>
  axiosInstance.post(`/api/inventory/${companyId}/cost-tracks/${id}/open`);

export const deleteCostTrack = (companyId, id) =>
  axiosInstance.delete(`/api/inventory/${companyId}/cost-tracks/${id}`);

// Job Orders
export const getJobOrders = (companyId, partyId, type, status) => {
  const url = `/api/inventory/${companyId}/job-orders`;
  return axiosInstance.get(url, { params: { partyId, type, status } });
};

export const getJobOrderById = (companyId, id) =>
  axiosInstance.get(`/api/inventory/${companyId}/job-orders/${id}`);

export const createJobOrder = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/job-orders`, data);

export const updateJobOrder = (companyId, id, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/job-orders/${id}`, data);

export const closeJobOrder = (companyId, id) =>
  axiosInstance.post(`/api/inventory/${companyId}/job-orders/${id}/close`);

export const openJobOrder = (companyId, id) =>
  axiosInstance.post(`/api/inventory/${companyId}/job-orders/${id}/open`);

export const deleteJobOrder = (companyId, id) =>
  axiosInstance.delete(`/api/inventory/${companyId}/job-orders/${id}`);

// Material Movements
export const getMaterialMovements = (companyId, jobOrderId, type, direction) => {
  const url = `/api/inventory/${companyId}/material-movements`;
  return axiosInstance.get(url, { params: { jobOrderId, type, direction } });
};

export const getMaterialMovementById = (companyId, id) =>
  axiosInstance.get(`/api/inventory/${companyId}/material-movements/${id}`);

export const createMaterialMovement = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/material-movements`, data);

export const updateMaterialMovement = (companyId, id, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/material-movements/${id}`, data);

export const deleteMaterialMovement = (companyId, id) =>
  axiosInstance.delete(`/api/inventory/${companyId}/material-movements/${id}`);

// Job Work Reports
export const getJobOrdersSummary = (companyId, type, status) =>
  axiosInstance.get(`/api/inventory/${companyId}/jobwork/orders-summary`, { params: { type, status } });

export const getComponentsOutstanding = (companyId, jobOrderId) =>
  axiosInstance.get(`/api/inventory/${companyId}/jobwork/components-outstanding`, { params: { jobOrderId } });

export const getMaterialInRegister = (companyId, jobOrderId, fromDate, toDate) =>
  axiosInstance.get(`/api/inventory/${companyId}/jobwork/material-in-register`, { params: { jobOrderId, fromDate, toDate } });

export const getMaterialOutRegister = (companyId, jobOrderId, fromDate, toDate) =>
  axiosInstance.get(`/api/inventory/${companyId}/jobwork/material-out-register`, { params: { jobOrderId, fromDate, toDate } });

export const getMaterialMovementRegister = (companyId, jobOrderId, fromDate, toDate) =>
  axiosInstance.get(`/api/inventory/${companyId}/jobwork/material-movement-register`, { params: { jobOrderId, fromDate, toDate } });

export const getIssueVariance = (companyId, jobOrderId) =>
  axiosInstance.get(`/api/inventory/${companyId}/jobwork/issue-variance`, { params: { jobOrderId } });

export const getReceiptVariance = (companyId, jobOrderId) =>
  axiosInstance.get(`/api/inventory/${companyId}/jobwork/receipt-variance`, { params: { jobOrderId } });

// ============================================
// Phase-3: Inventory Ledger Engine
// ============================================

// Transactions (Read-only - stock computation)
export const getInventoryTransactions = (companyId, filters) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/transactions`, { params: filters });

export const getStock = (companyId, itemId, godownId, batchId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/transactions/stock`, { params: { itemId, godownId, batchId } });

export const getAllStock = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/transactions/stock/all`);

// Tracking Numbers
export const getTrackingNumbers = (companyId, status) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/tracking`, { params: { status } });

export const getTrackingNumber = (companyId, trackingNo) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/tracking/${trackingNo}`);

export const createTrackingNumber = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/ledger/tracking`, data);

export const updateTrackingNumber = (companyId, trackingNo, data) =>
  axiosInstance.put(`/api/inventory/${companyId}/ledger/tracking/${trackingNo}`, data);

export const closeTrackingNumber = (companyId, trackingNo) =>
  axiosInstance.post(`/api/inventory/${companyId}/ledger/tracking/${trackingNo}/close`);

// Vouchers
export const createReceiptNote = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/receipt-notes`, data);

export const createDeliveryNote = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/delivery-notes`, data);

export const createPurchaseVoucher = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/purchases`, data);

export const createSalesVoucher = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/sales-vouchers`, data);

export const createRejectionIn = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/rejections-in`, data);

export const createRejectionOut = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/rejections-out`, data);

export const createStockJournal = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/stock-journal`, data);

export const createManufacturing = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/manufacturing`, data);

export const createMaterialIn = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/material-in`, data);

export const createMaterialOut = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/material-out`, data);

export const createPhysicalStock = (companyId, data) =>
  axiosInstance.post(`/api/inventory/${companyId}/physical-stock`, data);

// Reports (Computed from ledger)
export const getStockSummary = (companyId, itemId, godownId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/reports/stock-summary`, { params: { itemId, godownId } });

export const getBatchSummary = (companyId, itemId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/reports/batch-summary`, { params: { itemId } });

export const getGodownSummary = (companyId, godownId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/reports/godown-summary`, { params: { godownId } });

export const getNegativeStock = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/reports/negative-stock`);

export const getSalesBillsPending = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/reports/sales-bills-pending`);

export const getPurchaseBillsPending = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/reports/purchase-bills-pending`);

export const getJobworkOutstanding = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/ledger/reports/jobwork-outstanding`);

// ============================================
// Phase-4: Valuation & Profit Engine
// ============================================

// Stock valuation summary by method (FIFO / AVG / LAST / STD)
export const getValuationStockSummary = (companyId, method) =>
  axiosInstance.get(`/api/inventory/${companyId}/valuation/stock-summary`, {
    params: { method },
  });

// Detailed valuation for a single item (all methods side by side)
export const getItemValuation = (companyId, itemId) =>
  axiosInstance.get(`/api/inventory/${companyId}/valuation/item/${itemId}/valuation`);

// Profit report based on FIFO COGS
export const getProfitReport = (companyId) =>
  axiosInstance.get(`/api/inventory/${companyId}/valuation/profit-report`);

