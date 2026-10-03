import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 30000,
});

export const predict = (payload) => API.post("/predict", payload);
export const checkAnomaly = (rf_ratio) => API.post("/anomaly", { rf_ratio });
export const getHistory = (params) => API.get("/history", { params });
export const getAnomalies = (params) => API.get("/anomalies", { params });
export const getHistoricalData = (params) => API.get("/historical-data", { params });
export const getAnalytics = () => API.get("/analytics");
export const getStates = () => API.get("/states");
export const saveBatch = (results) => API.post("/predict/batch", { results });
export const exportCSV = (state) =>
  API.get("/export/csv", { params: state ? { state } : {}, responseType: "blob" });
export const exportPDF = (state) =>
  API.get("/export/pdf", { params: state ? { state } : {}, responseType: "blob" });

export default API;
