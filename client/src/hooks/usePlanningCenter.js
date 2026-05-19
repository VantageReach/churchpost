import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

export function usePCStatus() {
  return useQuery({
    queryKey: ["pcStatus"],
    queryFn: () => api.get("/integrations/planning-center/status").then((r) => r.data),
    staleTime: 1000 * 30,
    refetchInterval: (data) => (data?.syncStatus === "syncing" ? 4000 : false),
  });
}

export function usePCSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/integrations/planning-center/sync").then((r) => r.data),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["pcStatus"] }), 1500);
    },
  });
}

export function usePCUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      api.patch("/integrations/planning-center/settings", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pcStatus"] }),
  });
}

export function usePCDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/integrations/planning-center").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pcStatus"] }),
  });
}
