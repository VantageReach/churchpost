import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import api from "../lib/api.js";

export const ORG_ID_KEY = "churchpost_org_id";

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
      const orgId = localStorage.getItem(ORG_ID_KEY);
      if (orgId) config.headers["X-Org-Id"] = orgId;
      return config;
    });

    return () => api.interceptors.request.eject(id);
  }, [getToken]);
}
