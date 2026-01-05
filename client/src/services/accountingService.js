import axiosInstance from "../utils/axiosInstance";

// Phase-5: Accounting & Sales/Purchase Engine Services

// Party Masters
export const getParties = (companyId) =>
  axiosInstance.get(`/api/accounting/${companyId}/masters/parties`);

export const getPartyById = (companyId, partyId) =>
  axiosInstance.get(`/api/accounting/${companyId}/masters/parties/${partyId}`);

export const createParty = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/masters/parties`, data);

export const updateParty = (companyId, partyId, data) =>
  axiosInstance.put(`/api/accounting/${companyId}/masters/parties/${partyId}`, data);

export const deleteParty = (companyId, partyId) =>
  axiosInstance.delete(`/api/accounting/${companyId}/masters/parties/${partyId}`);

// Sales Wizard
export const createSalesWizard = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/sales/wizard`, data);

// Purchase Wizard
export const createPurchaseWizard = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/purchase/wizard`, data);

// Orders
export const createSalesOrder = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/orders/sales`, data);

export const createPurchaseOrder = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/orders/purchase`, data);

export const createJobOrder = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/orders/job`, data);

export const getPendingOrders = (companyId, orderType) =>
  axiosInstance.get(`/api/accounting/${companyId}/orders/pending`, {
    params: { orderType },
  });

export const getAllOrders = (companyId, orderType) =>
  axiosInstance.get(`/api/accounting/${companyId}/orders`, {
    params: { orderType },
  });

export const updateOrder = (companyId, orderType, orderId, data) =>
  axiosInstance.put(`/api/accounting/${companyId}/orders/${orderType}/${orderId}`, data);

export const precloseOrder = (companyId, orderType, orderId) =>
  axiosInstance.post(`/api/accounting/${companyId}/orders/${orderType}/${orderId}/preclose`);

// Outstanding
export const getAllOutstanding = (companyId) =>
  axiosInstance.get(`/api/accounting/${companyId}/outstanding`);

export const getOutstandingByParty = (companyId, partyId) =>
  axiosInstance.get(`/api/accounting/${companyId}/outstanding/party/${partyId}`);

export const getPartyOutstandingSummary = (companyId, partyId) =>
  axiosInstance.get(`/api/accounting/${companyId}/outstanding/party/${partyId}/summary`);

export const adjustOutstanding = (companyId, voucherId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/outstanding/${voucherId}/adjust`, data);

// Interest
export const runInterest = (companyId, asOfDate) =>
  axiosInstance.post(`/api/accounting/${companyId}/interest/run`, null, {
    params: { asOfDate },
  });

export const postInterest = (companyId, interestVoucherId, postAsDebitNote = true) =>
  axiosInstance.post(`/api/accounting/${companyId}/interest/${interestVoucherId}/post`, {
    postAsDebitNote,
  });

// Scenarios
export const getScenarios = (companyId) =>
  axiosInstance.get(`/api/accounting/${companyId}/scenarios`);

export const createScenario = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/scenarios`, data);

// Budgets
export const getBudgets = (companyId, period) =>
  axiosInstance.get(`/api/accounting/${companyId}/budgets`, {
    params: { period },
  });

export const getBudgetVariance = (companyId, period) =>
  axiosInstance.get(`/api/accounting/${companyId}/budgets/reports/variance`, {
    params: { period },
  });

export const createBudget = (companyId, data) =>
  axiosInstance.post(`/api/accounting/${companyId}/budgets`, data);


