import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import api from "../lib/api.js";
import { ORG_ID_KEY } from "./useAuthInterceptor.js";

export function useMe() {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["me"],
    queryFn: () =>
      api.get("/orgs/me").then((r) => {
        if (r.data?.org?.id) {
          const stored = localStorage.getItem(ORG_ID_KEY);
          // Only auto-store if nothing is stored yet (first login / invite claim)
          if (!stored) localStorage.setItem(ORG_ID_KEY, r.data.org.id);
        }
        return r.data;
      }),
    enabled: !!isSignedIn,
    retry: false,
    staleTime: 60_000,
  });
}

export function useCreateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post("/orgs", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useCheckSlug() {
  return useMutation({
    mutationFn: (slug) =>
      api.get(`/orgs/check-slug?slug=${encodeURIComponent(slug)}`).then((r) => r.data),
  });
}
