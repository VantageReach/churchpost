import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Church, CalendarDays, MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { usePCStatus } from "../../hooks/usePlanningCenter.js";

const SOURCE_LABELS = {
  calendar: "Calendar",
  services: "Service",
  groups: "Group",
  registrations: "Registration",
};

const SOURCE_COLORS = {
  calendar: { bg: "#eff6ff", text: "#3b82f6" },
  services: { bg: "#f0fdf4", text: "#16a34a" },
  groups: { bg: "#fef9c3", text: "#ca8a04" },
  registrations: { bg: "#fdf4ff", text: "#a855f7" },
};

function EventRow({ event, onClick }) {
  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  const isToday = startsAt && new Date().toDateString() === startsAt.toDateString();
  const colors = SOURCE_COLORS[event.source] || SOURCE_COLORS.calendar;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-4 px-4 transition-colors text-left group"
    >
      {/* Date badge */}
      <div className="flex-shrink-0 w-10 text-center">
        {startsAt ? (
          <>
            <p className="text-[10px] font-bold text-gray-400 uppercase">
              {startsAt.toLocaleDateString("en-US", { month: "short" })}
            </p>
            <p className="text-[18px] font-bold text-gray-700 leading-none">
              {startsAt.getDate()}
            </p>
          </>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center mx-auto">
            <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {isToday && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              Today
            </span>
          )}
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{ background: colors.bg, color: colors.text }}
          >
            {SOURCE_LABELS[event.source] || event.source}
          </span>
        </div>
        <p className="text-[13px] text-gray-700 truncate font-medium">{event.title}</p>
        {event.location && (
          <p className="text-[11px] text-gray-400 flex items-center gap-0.5 mt-0.5 truncate">
            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
            {event.location}
          </p>
        )}
      </div>

      <span className="text-[11px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center font-medium">
        Post →
      </span>
    </button>
  );
}

export default function PCEventsWidget() {
  const { data, isLoading } = usePCStatus();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  if (!data?.connected) return null;

  const events = data.upcomingEvents ?? [];
  const PAGE = 5;
  const visible = showAll ? events : events.slice(0, PAGE);
  const hiddenCount = events.length - PAGE;

  function handleEventClick(ev) {
    const dateStr = ev.startsAt
      ? new Date(ev.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : null;
    const aiTopic = dateStr ? `${ev.title} — ${dateStr}` : ev.title;
    navigate("/compose", { state: { prefill: { aiTopic } } });
  }

  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-md bg-[#E8F4EC] flex items-center justify-center">
            <Church className="h-3 w-3 text-[#3E9A55]" />
          </div>
          <h2 className="text-[13px] font-semibold text-gray-800 font-display">Church Events</h2>
          <span className="text-[10px] font-semibold text-[#3E9A55] bg-[#E8F4EC] px-1.5 py-0.5 rounded-full">
            PCO
          </span>
        </div>
        <Link
          to="/settings/platforms"
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Church className="h-8 w-8 text-gray-200 mb-2" />
            <p className="text-[12px] text-gray-400">No upcoming events found.</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Try syncing Planning Center in{" "}
              <Link to="/settings/platforms" className="text-indigo-500 hover:underline">
                Settings
              </Link>
              .
            </p>
          </div>
        ) : (
          <div>
            {visible.map((ev) => (
              <EventRow
                key={`${ev.pcEventId}-${ev.source}`}
                event={ev}
                onClick={() => handleEventClick(ev)}
              />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                {showAll ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>+{hiddenCount} more events <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
