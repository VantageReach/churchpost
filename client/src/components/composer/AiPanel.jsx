import { useState, useEffect } from "react";
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, RefreshCw, Church } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { usePCStatus } from "../../hooks/usePlanningCenter.js";

const SOURCE_COLORS = {
  services: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  calendar: { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" },
  groups: { bg: "#fef9c3", text: "#ca8a04", border: "#fde68a" },
  registrations: { bg: "#fdf4ff", text: "#a855f7", border: "#e9d5ff" },
};

function PCEventChips({ onSelect }) {
  const { data } = usePCStatus();
  if (!data?.connected || !data.upcomingEvents?.length) return null;

  const events = data.upcomingEvents.slice(0, 8);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="h-4 w-4 rounded bg-[#E8F4EC] flex items-center justify-center">
          <Church className="h-2.5 w-2.5 text-[#3E9A55]" />
        </div>
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          From your church
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
        {events.map((ev) => {
          const colors = SOURCE_COLORS[ev.source] || SOURCE_COLORS.calendar;
          const dateStr = ev.startsAt
            ? new Date(ev.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : null;
          const topic = dateStr ? `${ev.title} — ${dateStr}` : ev.title;

          return (
            <button
              key={`${ev.id}-${ev.source}`}
              type="button"
              onClick={() => onSelect(topic)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[12px] font-medium transition-all hover:shadow-sm active:scale-95"
              style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
            >
              <span>{ev.title}</span>
              {dateStr && (
                <span className="opacity-50 font-normal text-[11px]">{dateStr}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, onUse }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(suggestion.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-4 space-y-3 hover:border-indigo-200 hover:shadow-sm transition-all duration-150">
      <p className="text-[13px] text-gray-700 leading-relaxed">{suggestion.caption}</p>
      {suggestion.hashtags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestion.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onUse(suggestion.caption)}
          className="flex-1 py-1.5 rounded-lg text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand-primary)" }}
        >
          Use this caption
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function AiPanel({ platforms, onUseCaption, onSuggest, isLoading, suggestions, error, initialTopic }) {
  const [open, setOpen] = useState(!!initialTopic);
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [tone, setTone] = useState("");

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      setOpen(true);
    }
  }, [initialTopic]);

  function handleGenerate() {
    if (!topic.trim()) return;
    onSuggest({ topic, platforms, tone: tone || undefined });
  }

  return (
    <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-[13px] font-semibold text-indigo-700">AI Caption Ideas</span>
          {suggestions?.length > 0 && (
            <span className="text-[11px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {suggestions.length} ready
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-indigo-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-indigo-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-indigo-100">
          <div className="pt-3">
            <PCEventChips onSelect={(t) => setTopic(t)} />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Sunday service announcement, Easter event…"
              className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="rounded-lg border border-indigo-200 bg-white px-2 py-2 text-[12px] text-gray-600 outline-none focus:border-indigo-400 transition-all"
            >
              <option value="">Any tone</option>
              <option value="warm and welcoming">Warm</option>
              <option value="inspiring and uplifting">Inspiring</option>
              <option value="informational and clear">Informational</option>
              <option value="urgent and action-oriented">Urgent</option>
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!topic.trim() || isLoading}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium text-white transition-all",
                !topic.trim() || isLoading ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
              )}
              style={{ background: "var(--brand-primary)" }}
            >
              {isLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12px] text-red-600">
              {error}
            </div>
          )}

          {suggestions?.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <SuggestionCard key={i} suggestion={s} onUse={onUseCaption} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
