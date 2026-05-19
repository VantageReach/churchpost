import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => api.get("/ai/stats").then((r) => r.data),
    staleTime: 1000 * 60 * 2, // refresh every 2 minutes
    retry: false,
  });
}

export function useProactiveSuggestions() {
  return useQuery({
    queryKey: ["proactiveSuggestions"],
    queryFn: () => api.get("/ai/proactive").then((r) => r.data),
    staleTime: 1000 * 60 * 60, // 1 hour — don't hammer AI on every navigation
    retry: false,
  });
}
