import axiosInstance from "../utils/axiosInstance";

export const uploadSalesDataFile = (file, payload = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  if (payload.companyId) {
    formData.append("companyId", payload.companyId);
  }
  if (payload.companySnapshot) {
    formData.append("companySnapshot", JSON.stringify(payload.companySnapshot));
  }

  return axiosInstance.post("/api/sales-data-imports/upload", formData, {
    transformRequest: [
      (data, headers) => {
        delete headers["Content-Type"];
        return data;
      },
    ],
  });
};

export const processSalesDataImport = (id) =>
  axiosInstance.post(`/api/sales-data-imports/${id}/process`);

export const fetchProcessedSalesData = (id) =>
  axiosInstance.get(`/api/sales-data-imports/${id}/processed`);

export const fetchSalesImportsByCompany = (companyId) =>
  axiosInstance.get(`/api/sales-data-imports/company/${companyId}`);

export const fetchSalesImportById = (id) =>
  axiosInstance.get(`/api/sales-data-imports/${id}`);

export const deleteSalesImport = (id) =>
  axiosInstance.delete(`/api/sales-data-imports/${id}`);

export const downloadProcessedSalesExcel = async (id, filename = "SalesProcessed.xlsx") => {
  const response = await axiosInstance.get(
    `/api/sales-data-imports/${id}/processed/download`,
    { responseType: "blob" },
  );
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
