import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

export function useTikTokStatus() {
  return useQuery({
    queryKey: ["tiktokStatus"],
    queryFn: () => api.get("/integrations/tiktok/status").then((r) => r.data),
    staleTime: 1000 * 60,
  });
}

export function useTikTokConnect() {
  return useMutation({
    mutationFn: () => api.get("/integrations/tiktok/connect").then((r) => r.data.url),
    onSuccess: (url) => { window.location.href = url; },
  });
}

export function useTikTokDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/integrations/tiktok").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tiktokStatus"] }),
  });
}
