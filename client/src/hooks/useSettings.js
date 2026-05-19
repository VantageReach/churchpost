import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api.js";

export function useSettingsQuery() {
  return useQuery({
    queryKey: ["orgSettings"],
    queryFn: () => api.get("/settings").then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put("/settings", data).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData(["orgSettings"], updated);
    },
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ type, file }) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post(`/settings/logo/${type}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: ({ settings, url }, { type }) => {
      qc.invalidateQueries({ queryKey: ["orgSettings"] });
    },
  });
}
