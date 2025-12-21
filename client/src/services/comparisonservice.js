import axiosInstance from "../utils/axiosInstance";

export const compareGstr2BWithGstr2A = (gstr2bId, payload) =>
  axiosInstance.post(`/api/gstr2b-imports/${gstr2bId}/compare-with-gstr2a-download`, payload, {
    responseType: "blob",
  });

export const compareGstr2BWithPurchaseReg = (gstr2bId, formData) =>
  axiosInstance.post(`/api/gstr2b-imports/${gstr2bId}/compare-with-purchase-reg-download`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    responseType: "blob",
  });


