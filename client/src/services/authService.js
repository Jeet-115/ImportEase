import axiosInstance from "../utils/axiosInstance.js";

export const loginSoftware = async ({ email, password, deviceId }) => {
  const response = await axiosInstance.post("/software/login", {
    email,
    password,
    deviceId,
  });
  return response.data;
};


