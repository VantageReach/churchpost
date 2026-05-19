import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

const POSTS_KEY = ["posts"];

export function usePosts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.limit) params.set("limit", filters.limit);
  if (filters.offset) params.set("offset", filters.offset);

  return useQuery({
    queryKey: [...POSTS_KEY, filters],
    queryFn: () =>
      api.get(`/posts?${params.toString()}`).then((r) => r.data),
    staleTime: 1000 * 30,
  });
}

export function usePost(id) {
  return useQuery({
    queryKey: [...POSTS_KEY, id],
    queryFn: () => api.get(`/posts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/posts", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: POSTS_KEY }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      api.put(`/posts/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: POSTS_KEY }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/posts/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: POSTS_KEY }),
  });
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: (files) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return api
        .post("/media/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data.assets);
    },
  });
}

export function useCalendarPosts(year, month) {
  return useQuery({
    queryKey: ["calendarPosts", year, month],
    queryFn: () =>
      api.get(`/posts/calendar?year=${year}&month=${month}`).then((r) => r.data),
    staleTime: 1000 * 60,
  });
}

export function usePublishPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/posts/${id}/publish`).then((r) => r.data),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: POSTS_KEY }), 2000);
    },
  });
}

export function useAiSuggest() {
  return useMutation({
    mutationFn: (payload) =>
      api.post("/ai/suggest", payload).then((r) => r.data.suggestions),
  });
}
