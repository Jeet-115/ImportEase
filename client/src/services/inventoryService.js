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

