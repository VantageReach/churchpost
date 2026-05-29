import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import api from "../lib/api.js";

let cached = null; // { isPlatformAdmin, ts }
const TTL = 5 * 60 * 1000;

export function usePlatformAdmin() {
  const { getToken, isSignedIn } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(cached?.isPlatformAdmin ?? false);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!isSignedIn) { setLoading(false); return; }
    if (cached && Date.now() - cached.ts < TTL) {
      setIsPlatformAdmin(cached.isPlatformAdmin);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        const { data } = await api.get("/admin/me", { headers: { Authorization: `Bearer ${token}` } });
        cached = { isPlatformAdmin: data.isPlatformAdmin, ts: Date.now() };
        setIsPlatformAdmin(data.isPlatformAdmin);
      } catch {
        setIsPlatformAdmin(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

  return { isPlatformAdmin, loading };
}
