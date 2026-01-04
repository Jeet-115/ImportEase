import axiosInstance from "../utils/axiosInstance";

const BASE_URL = "/api/sales/party";

export const createSalesParty = (companyId, data) =>
  axiosInstance.post(`${BASE_URL}/${companyId}`, data);

export const getSalesParties = (companyId) =>
  axiosInstance.get(`${BASE_URL}/${companyId}`);

export const getSalesPartyById = (id) =>
  axiosInstance.get(`${BASE_URL}/single/${id}`);

export const updateSalesParty = (id, data) =>
  axiosInstance.put(`${BASE_URL}/${id}`, data);

export const deleteSalesParty = (id) =>
  axiosInstance.delete(`${BASE_URL}/${id}`);

