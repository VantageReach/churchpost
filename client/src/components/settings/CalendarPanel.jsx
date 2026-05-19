import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unplug,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "../../lib/utils.js";
import {
  useGCalStatus,
  useGCalConnect,
  useGCalSync,
  useGCalDisconnect,
} from "../../hooks/useGoogleCalendar.js";

function SyncStatusBadge({ status }) {
  const map = {
    idle: { label: "Idle", className: "bg-gray-100 text-gray-500" },
    syncing: { label: "Syncing…", className: "bg-blue-50 text-blue-600 animate-pulse" },
    success: { label: "Up to date", className: "bg-emerald-50 text-emerald-600" },
    error: { label: "Error", className: "bg-red-50 text-red-600" },
  };
  const { label, className } = map[status] || map.idle;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full",
        className
      )}
    >
      {label}
    </span>
  );
}

function GoogleCalendarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <rect x="6" y="8" width="36" height="36" rx="4" fill="white" stroke="#E0E0E0" strokeWidth="1.5" />
      <rect x="6" y="8" width="36" height="10" rx="4" fill="#1A73E8" />
      <rect x="6" y="16" width="36" height="2" fill="#1A73E8" />
      <circle cx="16" cy="10" r="2.5" fill="white" />
      <circle cx="32" cy="10" r="2.5" fill="white" />
      <rect x="14" y="6" width="2" height="8" rx="1" fill="white" />
      <rect x="32" y="6" width="2" height="8" rx="1" fill="white" />
      <text x="24" y="36" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1A73E8" fontFamily="sans-serif">
        G
      </text>
    </svg>
  );
}

function ConnectedCard({ data }) {
  const syncMutation = useGCalSync();
  const disconnect = useGCalDisconnect();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const lastSynced = data.lastSyncedAt
    ? new Date(data.lastSyncedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <GoogleCalendarIcon className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-gray-900">Google Calendar</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-[12px] text-gray-400">{data.email}</p>
          </div>
        </div>
        <SyncStatusBadge status={data.syncStatus} />
      </div>

      {/* Error banner */}
      {data.errorMessage && data.syncStatus === "error" && (
        <div className="flex items-start gap-2 px-5 py-3 border-b bg-red-50 border-red-100">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
          <p className="text-[12px] text-red-700">{data.errorMessage}</p>
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
          {data.eventCount ?? 0} upcoming events imported
        </span>
      </div>

      {/* Info */}
      <div className="px-5 py-4">
        <p className="text-[12px] text-gray-500">
          Events from your primary Google Calendar are imported and used by the AI to generate relevant post ideas.
          Syncs automatically every hour.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/50">
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || data.syncStatus === "syncing"}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              (syncMutation.isPending || data.syncStatus === "syncing") && "animate-spin"
            )}
          />
          Sync now
        </button>

        <div className="ml-auto">
          {confirmDisconnect ? (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-500">Are you sure?</span>
              <button
                onClick={() => { disconnect.mutate(); setConfirmDisconnect(false); }}
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
  const connect = useGCalConnect();

  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <GoogleCalendarIcon className="h-10 w-10" />
      </div>
      <h3 className="text-[14px] font-semibold text-gray-900 mb-1">Google Calendar</h3>
      <p className="text-[12px] text-gray-500 mb-5 max-w-xs mx-auto">
        Connect your church's Google Calendar to automatically import upcoming events and let the AI generate timely post ideas around them.
      </p>
      <button
        onClick={() => connect.mutate()}
        disabled={connect.isPending}
        className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-[#1A73E8] rounded-xl hover:bg-[#1558B0] transition-colors disabled:opacity-60"
      >
        <GoogleCalendarIcon className="h-4 w-4" />
        {connect.isPending ? "Connecting…" : "Connect Google Calendar"}
      </button>
    </div>
  );
}

export default function CalendarPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading } = useGCalStatus();

  const gcalConnected = searchParams.get("gcal_connected");
  const gcalError = searchParams.get("gcal_error");

  useEffect(() => {
    if (gcalConnected || gcalError) {
      const t = setTimeout(() => {
        setSearchParams((p) => {
          p.delete("gcal_connected");
          p.delete("gcal_error");
          return p;
        });
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [gcalConnected, gcalError, setSearchParams]);

  return (
    <div className="p-5 lg:p-8 max-w-2xl space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold text-gray-900 mb-0.5">Calendar</h2>
        <p className="text-[13px] text-gray-500">
          Import your church's calendar events to power AI content suggestions.
        </p>
      </div>

      {/* Flash messages */}
      {gcalConnected && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Google Calendar connected! Importing your upcoming events now.
        </div>
      )}
      {gcalError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Connection failed: {gcalError.replace(/_/g, " ")}. Please try again.
        </div>
      )}

      {isLoading ? (
        <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
      ) : data?.connected ? (
        <ConnectedCard data={data} />
      ) : (
        <DisconnectedCard />
      )}
    </div>
  );
}
