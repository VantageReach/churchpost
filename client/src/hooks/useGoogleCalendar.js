import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

export function useGCalStatus() {
  return useQuery({
    queryKey: ["gcalStatus"],
    queryFn: () => api.get("/integrations/google-calendar/status").then((r) => r.data),
    staleTime: 1000 * 30,
    refetchInterval: (query) =>
      query.state.data?.syncStatus === "syncing" ? 3000 : false,
  });
}

export function useGCalConnect() {
  return useMutation({
    mutationFn: () =>
      api.get("/integrations/google-calendar/connect").then((r) => r.data.url),
    onSuccess: (url) => { window.location.href = url; },
  });
}

export function useGCalSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/integrations/google-calendar/sync").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcalStatus"] }),
  });
}

export function useGCalDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/integrations/google-calendar").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gcalStatus"] }),
  });
}
