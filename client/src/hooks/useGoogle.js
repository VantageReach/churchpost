import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

export function useYouTubeStatus() {
  return useQuery({
    queryKey: ["youtubeStatus"],
    queryFn: () => api.get("/integrations/google/status").then((r) => r.data),
    staleTime: 1000 * 60,
  });
}

export function useYouTubeDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/integrations/google").then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["youtubeStatus"] }),
  });
}
