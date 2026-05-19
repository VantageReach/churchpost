import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unplug,
  ExternalLink,
  Calendar,
  Church,
  Clock,
  ChevronDown,
  ChevronUp,
  Facebook,
  Instagram,
} from "lucide-react";
import { cn } from "../../lib/utils.js";
import {
  usePCStatus,
  usePCSyncNow,
  usePCUpdateSettings,
  usePCDisconnect,
} from "../../hooks/usePlanningCenter.js";
import { useMetaStatus, useMetaDisconnect } from "../../hooks/useMeta.js";
import { useYouTubeStatus, useYouTubeDisconnect } from "../../hooks/useGoogle.js";
import { useTikTokStatus, useTikTokDisconnect } from "../../hooks/useTikTok.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const META_CONNECT_URL = `${API_BASE}/integrations/meta/connect`;
const GOOGLE_CONNECT_URL = `${API_BASE}/integrations/google/connect`;
const TIKTOK_CONNECT_URL = `${API_BASE}/integrations/tiktok/connect`;
const CONNECT_URL = `${API_BASE}/integrations/planning-center/connect`;

function SyncStatusBadge({ status }) {
  const map = {
    idle: { label: "Idle", className: "bg-gray-100 text-gray-500" },
    syncing: { label: "Syncing…", className: "bg-blue-50 text-blue-600 animate-pulse" },
    success: { label: "Up to date", className: "bg-emerald-50 text-emerald-600" },
    partial: { label: "Partial sync", className: "bg-amber-50 text-amber-600" },
    error: { label: "Error", className: "bg-red-50 text-red-600" },
  };
  const { label, className } = map[status] || map.idle;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full", className)}>
      {label}
    </span>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-indigo-600" : "bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function ConnectedCard({ data, onDisconnect }) {
  const syncNow = usePCSyncNow();
  const updateSettings = usePCUpdateSettings();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  function handleToggle(field, value) {
    updateSettings.mutate({ [field]: value });
  }

  function handleLookahead(e) {
    updateSettings.mutate({ lookAheadDays: Number(e.target.value) });
  }

  function handleFrequency(e) {
    updateSettings.mutate({ syncFrequencyHours: Number(e.target.value) });
  }

  const lastSynced = data.lastSyncedAt
    ? new Date(data.lastSyncedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Never";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#E8F4EC] flex items-center justify-center flex-shrink-0">
            <Church className="h-5 w-5 text-[#3E9A55]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-gray-900">Planning Center</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            {data.pcOrgName && (
              <p className="text-[12px] text-gray-400">{data.pcOrgName}</p>
            )}
          </div>
        </div>
        <SyncStatusBadge status={data.syncStatus} />
      </div>

      {/* Error / partial-sync banner */}
      {data.errorMessage && (
        <div className={`flex items-start gap-2 px-5 py-3 border-b ${data.syncStatus === "partial" ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100"}`}>
          <AlertCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${data.syncStatus === "partial" ? "text-amber-500" : "text-red-500"}`} />
          <p className={`text-[12px] ${data.syncStatus === "partial" ? "text-amber-700" : "text-red-700"}`}>{data.errorMessage}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-6 px-5 py-3 border-b border-gray-100 text-[12px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Last synced: {lastSynced}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {data.upcomingEvents?.length ?? 0} upcoming events
        </span>
      </div>

      {/* Sync source toggles */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sync sources</p>
        {[
          { field: "syncCalendar", label: "Calendar events", value: data.syncCalendar },
          { field: "syncServices", label: "Service plans", value: data.syncServices },
          { field: "syncGroups", label: "Open groups", value: data.syncGroups },
          { field: "syncRegistrations", label: "Registrations", value: data.syncRegistrations },
        ].map(({ field, label, value }) => (
          <div key={field} className="flex items-center justify-between">
            <span className="text-[13px] text-gray-700">{label}</span>
            <Toggle
              checked={value}
              onChange={(v) => handleToggle(field, v)}
              disabled={updateSettings.isPending}
            />
          </div>
        ))}
      </div>

      {/* Advanced settings */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span>Advanced settings</span>
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showAdvanced && (
          <div className="px-5 pb-4 space-y-4 border-t border-gray-100">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Look-ahead window
              </label>
              <select
                value={data.lookAheadDays}
                onChange={handleLookahead}
                disabled={updateSettings.isPending}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[14, 30, 60, 90].map((d) => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1.5">
                Auto-sync frequency
              </label>
              <select
                value={data.syncFrequencyHours}
                onChange={handleFrequency}
                disabled={updateSettings.isPending}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[1, 2, 4, 8, 12, 24].map((h) => (
                  <option key={h} value={h}>Every {h} hour{h !== 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={() => syncNow.mutate()}
          disabled={syncNow.isPending || data.syncStatus === "syncing"}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", syncNow.isPending && "animate-spin")} />
          Sync now
        </button>
        <a
          href="https://app.planningcenteronline.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open PCO
        </a>
        <div className="ml-auto">
          {confirmDisconnect ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-500">Are you sure?</span>
              <button
                onClick={() => { onDisconnect(); setConfirmDisconnect(false); }}
                className="px-3 py-1.5 text-[12px] font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Yes, disconnect
              </button>
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="px-3 py-1.5 text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDisconnect(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-500 hover:text-red-700 transition-colors"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DisconnectedCard() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
        <Church className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Planning Center</h3>
      <p className="text-[12px] text-gray-500 mb-4 max-w-xs mx-auto">
        Import your calendar events, service plans, groups, and registrations to use as AI content prompts.
      </p>
      <a
        href={CONNECT_URL}
        className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#3E9A55] rounded-xl hover:bg-[#357A44] transition-colors"
      >
        Connect Planning Center
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function MetaPlatformRow({ icon: Icon, label, iconBg, iconColor, account, onDisconnect, disconnecting }) {
  const [confirm, setConfirm] = useState(false);

  if (account?.connected) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-800">{label}</p>
          <p className="text-[11px] text-gray-400">{account.accountName}</p>
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
        {confirm ? (
          <div className="flex items-center gap-2">
            <button onClick={() => { onDisconnect(); setConfirm(false); }} className="text-[11px] text-white bg-red-500 px-2 py-1 rounded-lg hover:bg-red-600 transition-colors">
              Disconnect
            </button>
            <button onClick={() => setConfirm(false)} className="text-[11px] text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} disabled={disconnecting} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">
            <Unplug className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-700">{label}</p>
        <p className="text-[11px] text-gray-400">Not connected</p>
      </div>
    </div>
  );
}

function MetaCard() {
  const { data, isLoading } = useMetaStatus();
  const disconnect = useMetaDisconnect();

  const fb = data?.facebook;
  const ig = data?.instagram;
  const anyConnected = fb?.connected || ig?.connected;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <Facebook className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">Facebook & Instagram</p>
            <p className="text-[11px] text-gray-400">Publish posts to your church pages</p>
          </div>
        </div>
        {anyConnected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </div>

      <div className="px-5">
        {isLoading ? (
          <div className="py-4 space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : (
          <>
            <MetaPlatformRow
              icon={Facebook}
              label="Facebook Page"
              iconBg="#eff6ff"
              iconColor="#2563eb"
              account={fb}
              onDisconnect={() => disconnect.mutate("facebook")}
              disconnecting={disconnect.isPending}
            />
            <MetaPlatformRow
              icon={Instagram}
              label="Instagram Business"
              iconBg="#fdf4ff"
              iconColor="#a855f7"
              account={ig}
              onDisconnect={() => disconnect.mutate("instagram")}
              disconnecting={disconnect.isPending}
            />
          </>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
        {anyConnected ? (
          <p className="text-[11px] text-gray-400">
            Instagram connects automatically when a Business account is linked to your Facebook Page.
          </p>
        ) : (
          <a
            href={META_CONNECT_URL}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Facebook className="h-3.5 w-3.5" />
            Connect with Facebook
          </a>
        )}
      </div>
    </div>
  );
}

function YouTubeCard() {
  const { data, isLoading } = useYouTubeStatus();
  const disconnect = useYouTubeDisconnect();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#FF0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">YouTube</p>
            <p className="text-[11px] text-gray-400">Upload sermon videos to your channel</p>
          </div>
        </div>
        {data?.connected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="h-8 rounded-lg bg-gray-100 animate-pulse" />
        ) : data?.connected ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-800">{data.accountName}</p>
              <p className="text-[11px] text-gray-400">YouTube Channel</p>
            </div>
            <div className="flex items-center gap-2">
              {confirm ? (
                <>
                  <button onClick={() => { disconnect.mutate(); setConfirm(false); }} className="text-[11px] text-white bg-red-500 px-2 py-1 rounded-lg hover:bg-red-600 transition-colors">
                    Disconnect
                  </button>
                  <button onClick={() => setConfirm(false)} className="text-[11px] text-gray-400 hover:text-gray-600">Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirm(true)} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                  <Unplug className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <a
            href={GOOGLE_CONNECT_URL}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Connect YouTube
          </a>
        )}
      </div>
    </div>
  );
}

function TikTokIcon({ className, fill = "currentColor" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={fill}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  );
}

function TikTokCard() {
  const { data, isLoading } = useTikTokStatus();
  const disconnect = useTikTokDisconnect();
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gray-900 flex items-center justify-center">
            <TikTokIcon className="h-4 w-4" fill="white" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">TikTok</p>
            <p className="text-[11px] text-gray-400">Share short-form videos with your audience</p>
          </div>
        </div>
        {data?.connected && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="h-8 rounded-lg bg-gray-100 animate-pulse" />
        ) : data?.connected ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-gray-800">{data.accountName}</p>
              <p className="text-[11px] text-gray-400">TikTok Account</p>
            </div>
            <div className="flex items-center gap-2">
              {confirm ? (
                <>
                  <button onClick={() => { disconnect.mutate(); setConfirm(false); }} className="text-[11px] text-white bg-red-500 px-2 py-1 rounded-lg hover:bg-red-600 transition-colors">
                    Disconnect
                  </button>
                  <button onClick={() => setConfirm(false)} className="text-[11px] text-gray-400 hover:text-gray-600">Cancel</button>
                </>
              ) : (
                <button onClick={() => setConfirm(true)} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">
                  <Unplug className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <a
            href={TIKTOK_CONNECT_URL}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors"
          >
            <TikTokIcon className="h-3.5 w-3.5" fill="white" />
            Connect TikTok
          </a>
        )}
      </div>
    </div>
  );
}

export default function PlatformsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading } = usePCStatus();
  const disconnect = usePCDisconnect();

  const pcConnected = searchParams.get("pc_connected");
  const pcError = searchParams.get("pc_error");
  const metaConnected = searchParams.get("meta_connected");
  const metaError = searchParams.get("meta_error");
  const googleConnected = searchParams.get("google_connected");
  const googleError = searchParams.get("google_error");
  const tiktokConnected = searchParams.get("tiktok_connected");
  const tiktokError = searchParams.get("tiktok_error");

  useEffect(() => {
    const hasFlash = pcConnected || pcError || metaConnected || metaError || googleConnected || googleError || tiktokConnected || tiktokError;
    if (hasFlash) {
      const t = setTimeout(() => {
        setSearchParams((p) => {
          ["pc_connected", "pc_error", "meta_connected", "meta_error", "google_connected", "google_error", "tiktok_connected", "tiktok_error"].forEach((k) => p.delete(k));
          return p;
        });
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [pcConnected, pcError, metaConnected, metaError, googleConnected, googleError, tiktokConnected, tiktokError, setSearchParams]);

  return (
    <div className="p-5 lg:p-8 max-w-2xl space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-gray-900 mb-0.5">Platform Connections</h2>
        <p className="text-[13px] text-gray-500">
          Connect your publishing platforms and content sources.
        </p>
      </div>

      {/* Flash messages */}
      {(pcConnected || metaConnected || googleConnected || tiktokConnected) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {metaConnected ? "Facebook connected! Instagram linked automatically if available."
            : googleConnected ? "YouTube channel connected!"
            : tiktokConnected ? "TikTok account connected!"
            : "Planning Center connected! First sync running in the background."}
        </div>
      )}
      {(pcError || metaError || googleError || tiktokError) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Connection failed: {(pcError || metaError || googleError || tiktokError).replace(/_/g, " ")}. Please try again.
        </div>
      )}

      {/* Facebook & Instagram */}
      <MetaCard />

      {/* YouTube */}
      <YouTubeCard />

      {/* TikTok */}
      <TikTokCard />

      {/* Planning Center */}
      {isLoading ? (
        <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
      ) : data?.connected ? (
        <ConnectedCard data={data} onDisconnect={() => disconnect.mutate()} />
      ) : (
        <DisconnectedCard />
      )}

      {/* Coming soon */}
      <div className="rounded-2xl border border-dashed border-gray-200 p-5">
        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Coming soon</p>
        <div className="space-y-2">
          {["Google Calendar"].map((name) => (
            <div key={name} className="flex items-center gap-2 text-[13px] text-gray-400">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
