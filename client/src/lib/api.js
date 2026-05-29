import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001/api" : "/api"),
  withCredentials: true,
});

// Attach X-Admin-Org header when a platform admin is impersonating an org
api.interceptors.request.use((config) => {
  const adminOrgId = localStorage.getItem("adminOrgOverride");
  if (adminOrgId) {
    config.headers["X-Admin-Org"] = adminOrgId;
  }
  return config;
});

export function startImpersonating(orgId) {
  localStorage.setItem("adminOrgOverride", orgId);
}

export function stopImpersonating() {
  localStorage.removeItem("adminOrgOverride");
}

export function getImpersonatingOrgId() {
  return localStorage.getItem("adminOrgOverride");
}

export default api;
