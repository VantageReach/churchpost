import { useNavigate } from "react-router-dom";
import { Shield, X } from "lucide-react";
import { stopImpersonating, getImpersonatingOrgId } from "../../lib/api.js";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminImpersonateBanner({ orgName }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!getImpersonatingOrgId()) return null;

  function handleExit() {
    stopImpersonating();
    queryClient.clear();
    navigate("/admin");
    // Force a full reload so all org-scoped data clears
    window.location.href = "/admin";
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-violet-600 text-white text-[12px] font-medium flex-shrink-0">
      <Shield className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1">
        Viewing as <strong>{orgName || "…"}</strong> — all actions affect this org's real data
      </span>
      <button
        onClick={handleExit}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-[11px] font-semibold"
      >
        <X className="h-3 w-3" /> Exit
      </button>
    </div>
  );
}
