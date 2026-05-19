import { Link } from "react-router-dom";
import { CalendarDays, Clock, PenSquare } from "lucide-react";
import PlatformBadge from "../shared/PlatformBadge.jsx";

function UpcomingRow({ post }) {
  const scheduled = new Date(post.scheduledAt);
  const isToday = new Date().toDateString() === scheduled.toDateString();

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      {/* Date badge */}
      <div className="flex-shrink-0 w-10 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase">
          {scheduled.toLocaleDateString("en-US", { month: "short" })}
        </p>
        <p className="text-[18px] font-bold text-gray-700 leading-none">
          {scheduled.getDate()}
        </p>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {isToday && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              Today
            </span>
          )}
          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {scheduled.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-[13px] text-gray-700 truncate">
          {post.title || Object.values(post.captions ?? {})[0]?.slice(0, 60) || "Untitled post"}
        </p>
        <div className="flex gap-1 mt-1 flex-wrap">
          {(post.platforms ?? []).slice(0, 3).map((p) => (
            <PlatformBadge key={p} platform={p} size="sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UpcomingPostsWidget({ posts = [] }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <h2 className="text-[13px] font-semibold text-gray-800 font-display">Next 7 days</h2>
        </div>
        <Link
          to="/calendar"
          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          View calendar →
        </Link>
      </div>

      <div className="p-4">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <CalendarDays className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-[13px] font-medium text-gray-500 mb-1">Nothing scheduled</p>
            <p className="text-[11px] text-gray-400 mb-4">
              Use the AI suggestions to create content for the week.
            </p>
            <Link
              to="/compose"
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ background: "var(--brand-primary)" }}
            >
              <PenSquare className="h-3 w-3" />
              Compose
            </Link>
          </div>
        ) : (
          <div>
            {posts.map((p) => (
              <UpcomingRow key={p.id} post={p} />
            ))}
            <Link
              to="/posts?status=SCHEDULED"
              className="block mt-3 text-center text-[11px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              View all scheduled →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
