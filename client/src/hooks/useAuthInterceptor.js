import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import api from "../lib/api.js";

export function useAuthInterceptor() {
  const { getToken } = useAuth();

  useEffect(() => {
    const id = api.interceptors.request.use(async (config) => {
      try {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Not signed in — continue without token
      }
      return config;
    });

    return () => api.interceptors.request.eject(id);
  }, [getToken]);
}
