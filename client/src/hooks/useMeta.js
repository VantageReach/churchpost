import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

export function useMetaStatus() {
  return useQuery({
    queryKey: ["metaStatus"],
    queryFn: () => api.get("/integrations/meta/status").then((r) => r.data),
    staleTime: 1000 * 60,
  });
}

export function useMetaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (platform) =>
      api.delete(`/integrations/meta/${platform}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metaStatus"] }),
  });
}
