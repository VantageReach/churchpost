import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { CalendarDays, ChevronLeft, ChevronRight, PenSquare } from "lucide-react";
import { useCalendarPosts, useUpdatePost } from "../hooks/usePosts.js";
import { getPlatformMeta } from "../components/shared/PlatformBadge.jsx";

const STATUS_COLORS = {
  DRAFT:      { bg: "#f3f4f6", border: "#d1d5db", text: "#6b7280" },
  SCHEDULED:  { bg: "#eff6ff", border: "#93c5fd", text: "#2563eb" },
  PUBLISHED:  { bg: "#f0fdf4", border: "#86efac", text: "#16a34a" },
  FAILED:     { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
  PARTIAL:    { bg: "#fff7ed", border: "#fdba74", text: "#ea580c" },
};

const CATEGORY_STYLES = {
  holiday:    { bg: "#fef9c3", border: "#fde047", text: "#854d0e", emoji: true },
  liturgical: { bg: "#faf5ff", border: "#d8b4fe", text: "#7c3aed", emoji: true },
  awareness:  { bg: "#f0fdfa", border: "#5eead4", text: "#0f766e", emoji: true },
  fun:        { bg: "#fff1f2", border: "#fda4af", text: "#be123c", emoji: true },
};

function PostPopover({ event, position, onClose, onEdit }) {
  if (!event) return null;
  const post = event.extendedProps?.post;
  if (!post) return null;

  const caption = Object.values(post.captions ?? {})[0] ?? "";
  const statusStyle = STATUS_COLORS[post.status] ?? STATUS_COLORS.DRAFT;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ top: Math.min(position.y, window.innerHeight - 320), left: Math.min(position.x, window.innerWidth - 300) }}
      >
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: statusStyle.bg, color: statusStyle.text }}
          >
            {post.status}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => { onEdit(post.id); onClose(); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <PenSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          {post.title && (
            <p className="text-[13px] font-semibold text-gray-800">{post.title}</p>
          )}
          <p className="text-[12px] text-gray-600 leading-relaxed line-clamp-3">{caption}</p>
          <div className="flex flex-wrap gap-1">
            {(post.platforms ?? []).map((p) => {
              const meta = getPlatformMeta(p);
              return (
                <span
                  key={p}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
          {post.scheduledAt && (
            <p className="text-[11px] text-gray-400">
              {new Date(post.scheduledAt).toLocaleString("en-US", {
                weekday: "short", month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit",
              })}
            </p>
          )}
          {post.author?.name && (
            <p className="text-[10px] text-gray-400">By {post.author.name}</p>
          )}
        </div>
      </div>
    </>
  );
}

const VIEW_OPTIONS = [
  { key: "dayGridMonth", label: "Month" },
  { key: "timeGridWeek", label: "Week" },
  { key: "listWeek",     label: "List" },
];

export default function Calendar() {
  const calendarRef = useRef(null);
  const navigate = useNavigate();
  const updatePost = useUpdatePost();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("dayGridMonth");
  const [popover, setPopover] = useState(null); // { event, position }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data, isLoading } = useCalendarPosts(year, month);

  // Build FullCalendar events from posts
  const postEvents = (data?.posts ?? []).map((post) => {
    const style = STATUS_COLORS[post.status] ?? STATUS_COLORS.DRAFT;
    const dateField = post.scheduledAt || post.publishedAt || post.createdAt;
    const firstPlatform = post.platforms?.[0];
    const platformMeta = firstPlatform ? getPlatformMeta(firstPlatform) : null;

    const fullTitle = post.title || Object.values(post.captions ?? {})[0] || "Untitled";
    return {
      id: post.id,
      title: fullTitle,
      start: dateField,
      end: dateField,
      allDay: post.status === "DRAFT" && !post.scheduledAt,
      backgroundColor: platformMeta ? platformMeta.color + "22" : style.bg,
      borderColor: platformMeta ? platformMeta.color : style.border,
      textColor: platformMeta ? platformMeta.color : style.text,
      extendedProps: { post, type: "post" },
    };
  });

  // Build national calendar background events
  const nationalEvents = (data?.nationalEvents ?? []).map((entry) => ({
    id: `nat-${entry.key}`,
    title: `${entry.emoji} ${entry.label}`,
    start: entry.date,
    allDay: true,
    display: "background",
    backgroundColor: CATEGORY_STYLES[entry.category]?.bg ?? "#f9fafb",
    extendedProps: { type: "national", entry },
    classNames: ["fc-national-event"],
  }));

  // Also show national events as small chips in month view
  const nationalChips = (data?.nationalEvents ?? []).map((entry) => {
    const style = CATEGORY_STYLES[entry.category] ?? {};
    return {
      id: `chip-${entry.key}`,
      title: `${entry.emoji} ${entry.label}`,
      start: entry.date,
      allDay: true,
      display: "block",
      backgroundColor: style.bg ?? "#f9fafb",
      borderColor: style.border ?? "#e5e7eb",
      textColor: style.text ?? "#374151",
      extendedProps: { type: "national", entry },
      classNames: ["fc-national-chip"],
    };
  });

  const allEvents = [...postEvents, ...nationalChips];

  function navigate_(direction) {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    direction === "prev" ? api.prev() : api.next();
    setCurrentDate(api.getDate());
    setPopover(null);
  }

  function goToday() {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.today();
    setCurrentDate(new Date());
    setPopover(null);
  }

  function switchView(v) {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView(v);
    setView(v);
    setPopover(null);
  }

  function handleEventClick(info) {
    const { event, jsEvent } = info;
    if (event.extendedProps?.type === "national") return;
    jsEvent.stopPropagation();
    setPopover({
      event,
      position: { x: jsEvent.clientX + 8, y: jsEvent.clientY + 8 },
    });
  }

  function handleDateClick(info) {
    setPopover(null);
    navigate("/compose", {
      state: { prefill: { scheduledAt: info.date.toISOString() } },
    });
  }

  async function handleEventDrop(info) {
    const post = info.event.extendedProps?.post;
    if (!post) return;
    try {
      await updatePost.mutateAsync({
        id: post.id,
        scheduledAt: info.event.start?.toISOString() ?? null,
        status: "SCHEDULED",
      });
    } catch {
      info.revert();
    }
  }

  const title = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 lg:px-8 py-4 lg:py-5 border-b border-gray-100 bg-[#F7F7F5] flex-shrink-0">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
              <CalendarDays className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-gray-900 font-display leading-none">
                Calendar
              </h1>
              <p className="text-[12px] text-gray-400 mt-0.5 hidden sm:block">Visual post schedule</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher — hidden on smallest screens */}
            <div className="hidden sm:flex bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {VIEW_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchView(key)}
                  className="px-3 py-1.5 text-[12px] font-medium transition-colors"
                  style={
                    view === key
                      ? { background: "var(--brand-primary)", color: "#fff" }
                      : { color: "#6b7280" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Nav */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate_("prev")}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] lg:text-[14px] font-semibold text-gray-800 min-w-[110px] lg:min-w-[140px] text-center">
                {title}
              </span>
              <button
                onClick={() => navigate_("next")}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={goToday}
              className="hidden sm:block px-3 py-1.5 rounded-xl text-[12px] font-medium border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors"
            >
              Today
            </button>

            <button
              onClick={() => navigate("/compose")}
              className="flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-xl text-[13px] font-medium text-white hover:opacity-90 transition-all shadow-sm"
              style={{ background: "var(--brand-primary)" }}
            >
              <PenSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Post</span>
            </button>
          </div>
        </div>

        {/* Mobile: view switcher below */}
        <div className="flex sm:hidden gap-1 mt-3">
          {VIEW_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchView(key)}
              className="flex-1 py-1.5 text-[12px] font-medium rounded-lg transition-colors"
              style={
                view === key
                  ? { background: "var(--brand-primary)", color: "#fff" }
                  : { color: "#6b7280", background: "#f3f4f6" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 lg:gap-4 px-4 lg:px-8 py-2 border-b border-gray-100 bg-white flex-shrink-0 overflow-x-auto">
        {Object.entries(STATUS_COLORS).filter(([k]) => k !== "PARTIAL").map(([status, style]) => (
          <span key={status} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: style.text }}>
            <span className="h-2 w-2 rounded-full" style={{ background: style.border }} />
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
        ))}
        <span className="text-gray-300 mx-1">|</span>
        {Object.entries(CATEGORY_STYLES).map(([cat, style]) => (
          <span key={cat} className="flex items-center gap-1 text-[11px] font-medium" style={{ color: style.text }}>
            <span className="h-2 w-2 rounded-full" style={{ background: style.border }} />
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </span>
        ))}
        <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0 hidden sm:block">Click a day to compose · Drag to reschedule</span>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden p-3 lg:p-6">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
          </div>
        )}

        <div className={`h-full ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity`}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            events={allEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            editable={true}
            eventDrop={handleEventDrop}
            dayMaxEvents={4}
            height="100%"
            eventClassNames={(arg) => {
              if (arg.event.extendedProps?.type === "national") return ["fc-national-chip"];
              return ["fc-post-event"];
            }}
            dayCellClassNames="fc-day-cell-hover"
          />
        </div>
      </div>

      {/* Post popover */}
      {popover && (
        <PostPopover
          event={popover.event}
          position={popover.position}
          onClose={() => setPopover(null)}
          onEdit={(id) => navigate(`/compose/${id}`)}
        />
      )}

      <style>{`
        .fc .fc-daygrid-day:hover { background: #fafafa; cursor: pointer; }
        .fc .fc-day-today { background: rgba(99,102,241,0.04) !important; }
        .fc .fc-day-today .fc-daygrid-day-number {
          background: var(--brand-primary); color: white;
          border-radius: 50%; width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
        }
        .fc .fc-col-header-cell {
          background: #f9fafb; padding: 8px 0;
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #9ca3af;
        }
        .fc .fc-daygrid-day-number { font-size: 12px; font-weight: 600; color: #374151; padding: 6px 8px; }
        .fc-post-event { border-radius: 6px !important; padding: 1px 5px !important; font-size: 11px !important; font-weight: 600 !important; cursor: pointer !important; overflow: hidden !important; }
        .fc-post-event .fc-event-title { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
        .fc-national-chip { border-radius: 4px !important; padding: 1px 4px !important; font-size: 10px !important; font-weight: 500 !important; opacity: 0.85; cursor: default !important; pointer-events: none !important; }
        .fc .fc-daygrid-event-harness { margin-top: 1px !important; }
        .fc .fc-toolbar { display: none !important; }
        .fc { font-family: inherit; }
        .fc .fc-scrollgrid { border-radius: 16px; overflow: hidden; border-color: #f3f4f6 !important; }
        .fc .fc-scrollgrid td, .fc .fc-scrollgrid th { border-color: #f3f4f6 !important; }
        .fc-list-event:hover td { background: #f9fafb !important; }
        .fc-list-day-cushion { background: #f9fafb !important; }
      `}</style>
    </div>
  );
}
