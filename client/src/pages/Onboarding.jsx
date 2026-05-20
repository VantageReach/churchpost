import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Church, ChevronRight, Check, AlertCircle, Loader2 } from "lucide-react";
import { useMe, useCreateOrg, useCheckSlug } from "../hooks/useMe.js";

const TIMEZONES = [
  { value: "America/New_York",    label: "Eastern Time (ET)" },
  { value: "America/Chicago",     label: "Central Time (CT)" },
  { value: "America/Denver",      label: "Mountain Time (MT)" },
  { value: "America/Phoenix",     label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage",   label: "Alaska Time" },
  { value: "Pacific/Honolulu",    label: "Hawaii Time" },
  { value: "America/Toronto",     label: "Toronto (ET)" },
  { value: "America/Vancouver",   label: "Vancouver (PT)" },
  { value: "Europe/London",       label: "London (GMT/BST)" },
  { value: "Europe/Berlin",       label: "Central Europe" },
  { value: "Australia/Sydney",    label: "Sydney (AEST)" },
];

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: me, isLoading: meLoading } = useMe();
  const createOrg = useCreateOrg();
  const checkSlug = useCheckSlug();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null); // null | "checking" | "available" | "taken" | "invalid"
  const [timezone, setTimezone] = useState("America/Chicago");
  const [error, setError] = useState(null);

  // If already has org, redirect to dashboard
  useEffect(() => {
    if (!meLoading && me?.hasOrg) {
      navigate("/", { replace: true });
    }
  }, [me, meLoading, navigate]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManual && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugManual]);

  // Debounce slug availability check
  useEffect(() => {
    if (!slug) { setSlugStatus(null); return; }
    if (!/^[a-z0-9-]+$/.test(slug)) { setSlugStatus("invalid"); return; }

    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const result = await checkSlug.mutateAsync(slug);
        setSlugStatus(result.available ? "available" : "taken");
      } catch {
        setSlugStatus(null);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [slug]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Please enter your church name."); return; }
    if (!slug.trim()) { setError("Please enter a URL slug."); return; }
    if (slugStatus === "taken") { setError("That slug is already taken. Please choose another."); return; }
    if (slugStatus === "invalid") { setError("Slug can only contain lowercase letters, numbers, and hyphens."); return; }

    try {
      await createOrg.mutateAsync({ name: name.trim(), slug: slug.trim(), timezone });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    }
  }

  if (meLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAF7]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "#6366f1" }}>
          <Church className="h-5 w-5 text-white" />
        </div>
        <span className="text-[18px] font-semibold text-gray-900 font-display">ChurchPost</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-gray-100">
          <h1 className="text-[22px] font-semibold text-gray-900 font-display leading-tight">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}! 👋
          </h1>
          <p className="text-[13px] text-gray-500 mt-1.5">
            Let's set up your church's ChurchPost account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Church name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
              Church Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grace Community Church"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
              Your ChurchPost URL *
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="grace-community"
                className="flex-1 px-4 py-2.5 text-[14px] text-gray-800 placeholder-gray-300 outline-none bg-transparent"
              />
              <span className="px-3 text-[12px] text-gray-400 border-l border-gray-200 bg-gray-50 h-full flex items-center py-2.5 whitespace-nowrap">
                .churchpost.social
              </span>
            </div>
            <div className="flex items-center gap-1.5 h-4">
              {slugStatus === "checking" && (
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                </span>
              )}
              {slugStatus === "available" && (
                <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Available
                </span>
              )}
              {slugStatus === "taken" && (
                <span className="text-[11px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Already taken
                </span>
              )}
              {slugStatus === "invalid" && (
                <span className="text-[11px] text-red-500">Lowercase letters, numbers, and hyphens only</span>
              )}
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400">
              Timezone *
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-[14px] text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white appearance-none cursor-pointer"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createOrg.isPending || slugStatus === "taken" || slugStatus === "invalid" || slugStatus === "checking"}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 mt-2"
            style={{ background: "#6366f1" }}
          >
            {createOrg.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
            ) : (
              <>Create My Account <ChevronRight className="h-4 w-4" /></>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-[12px] text-gray-400">
        Questions?{" "}
        <a href="mailto:hello@churchpost.social" className="text-indigo-500 hover:underline">
          hello@churchpost.social
        </a>
      </p>
    </div>
  );
}
