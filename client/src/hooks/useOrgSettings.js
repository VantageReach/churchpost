import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/api.js";

export function useOrgSettings() {
  const { data: settings } = useQuery({
    queryKey: ["orgSettings"],
    queryFn: () => api.get("/org-settings").then((r) => r.data),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", settings.brandPrimaryColor);
    root.style.setProperty("--brand-secondary", settings.brandSecondaryColor);
    root.style.setProperty("--brand-text-on-primary", settings.brandTextOnPrimary);
    root.style.setProperty(
      "--brand-font",
      `'${settings.brandFontFamily}', system-ui, sans-serif`
    );
  }, [settings]);

  return settings; // includes orgName, orgSlug, orgPlan alongside brand settings
}
