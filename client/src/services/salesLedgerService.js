import axiosInstance from "../utils/axiosInstance";

const BASE_URL = "/api/sales/ledger";

export const createSalesLedger = (data) =>
  axiosInstance.post(BASE_URL, data);

export const getSalesLedgers = () =>
  axiosInstance.get(BASE_URL);

export const getSalesLedgerById = (id) =>
  axiosInstance.get(`${BASE_URL}/${id}`);

export const updateSalesLedger = (id, data) =>
  axiosInstance.put(`${BASE_URL}/${id}`, data);

export const deleteSalesLedger = (id) =>
  axiosInstance.delete(`${BASE_URL}/${id}`);

