import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

const KEY = ["analytics"];

export function useAnalyticsOverview(days = 30) {
  return useQuery({
    queryKey: [...KEY, "overview", days],
    queryFn: () => api.get(`/analytics/overview?days=${days}`).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAnalyticsPosts(filters = {}) {
  const { days = 30, platform = "all", limit = 50, offset = 0 } = filters;
  return useQuery({
    queryKey: [...KEY, "posts", filters],
    queryFn: () =>
      api
        .get(`/analytics/posts?days=${days}&platform=${platform}&limit=${limit}&offset=${offset}`)
        .then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAnalyticsPost(postId) {
  return useQuery({
    queryKey: [...KEY, "post", postId],
    queryFn: () => api.get(`/analytics/posts/${postId}`).then((r) => r.data),
    enabled: !!postId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAccountMetrics(days = 90, platform = "all") {
  return useQuery({
    queryKey: [...KEY, "account", days, platform],
    queryFn: () =>
      api.get(`/analytics/account?days=${days}&platform=${platform}`).then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTriggerAnalyticsSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/analytics/sync"),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: KEY }), 3000);
    },
  });
}
