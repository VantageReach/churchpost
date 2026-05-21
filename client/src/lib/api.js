import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001/api" : "/api"),
  withCredentials: true,
});

export default api;
