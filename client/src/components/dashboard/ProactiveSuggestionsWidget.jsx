import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, RefreshCw, Copy, Check, PenSquare, Palette } from "lucide-react";
import { useProactiveSuggestions } from "../../hooks/useDashboardStats.js";
import { useQueryClient } from "@tanstack/react-query";
import PlatformBadge from "../shared/PlatformBadge.jsx";
import GraphicBuilderModal from "../graphicBuilder/GraphicBuilderModal.jsx";

function DaysChip({ daysUntil }) {
  const urgent = daysUntil <= 3;
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: urgent ? "#fef2f2" : "#f0fdf4",
        color: urgent ? "#ef4444" : "#16a34a",
      }}
    >
      {daysUntil === 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `In ${daysUntil}d`}
    </span>
  );
}

function SuggestionCard({ s, onUse, onBuildGraphic }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(s.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="group border border-gray-100 rounded-xl p-4 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all duration-150 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base leading-none">{s.eventEmoji}</span>
          <span className="text-[12px] font-semibold text-gray-800">{s.eventLabel}</span>
          <DaysChip daysUntil={s.daysUntil} />
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors"
            title="Copy caption"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onBuildGraphic(s)}
            className="p-1 rounded text-gray-400 hover:text-emerald-600 transition-colors"
            title="Create graphic for this"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onUse(s)}
            className="p-1 rounded text-gray-400 hover:text-indigo-600 transition-colors"
            title="Use in composer"
          >
            <PenSquare className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[12px] text-gray-500 italic leading-relaxed line-clamp-2">{s.topic}</p>
      <p className="text-[13px] text-gray-700 leading-relaxed">{s.caption}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {s.platforms?.map((p) => <PlatformBadge key={p} platform={p} size="sm" />)}
        {s.hashtags?.slice(0, 3).map((h) => (
          <span key={h} className="text-[10px] text-indigo-400 font-medium">#{h}</span>
        ))}
      </div>
    </div>
  );
}

export default function ProactiveSuggestionsWidget() {
  const { data, isLoading, isError } = useProactiveSuggestions();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [graphicPrefill, setGraphicPrefill] = useState(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["proactiveSuggestions"] });
  }

  function useInComposer(s) {
    navigate("/compose", {
      state: {
        prefill: {
          topic: s.topic,
          caption: s.caption,
          platforms: s.platforms,
        },
      },
    });
  }

  function buildGraphic(s) {
    const text = s.caption?.split("\n")[0]?.replace(/#\w+/g, "").trim().slice(0, 80) || s.eventLabel;
    const template = s.caption?.match(/\d:\d\d|\d+:\d+|psalm|proverbs|john|matthew|genesis/i) ? "scripture" : s.eventLabel?.toLowerCase().includes("sunday") ? "thisSunday" : "announcement";
    setGraphicPrefill({ text, template });
  }

  return (
    <>
    <GraphicBuilderModal
      open={!!graphicPrefill}
      onClose={() => setGraphicPrefill(null)}
      onExport={() => setGraphicPrefill(null)}
      prefill={graphicPrefill}
    />
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
          <h2 className="text-[13px] font-semibold text-gray-800 font-display">
            Upcoming content ideas
          </h2>
          {data?.suggestions?.length > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">
              {data.suggestions.length}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Refresh ideas"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-indigo-500 animate-spin" />
            <p className="text-[12px] text-gray-400">Generating ideas based on upcoming events…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-[13px] text-gray-500 mb-1">Couldn't load suggestions</p>
            <p className="text-[11px] text-gray-400 mb-3">Check that ANTHROPIC_API_KEY is set in your .env</p>
            <button
              onClick={refresh}
              className="text-[12px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : data?.suggestions?.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-[13px] text-gray-500">No upcoming events in the next 21 days</p>
            <p className="text-[11px] text-gray-400 mt-1">Check your calendar settings</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.hasGap && data?.upcomingCount < 3 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2 mb-3">
                <span className="text-amber-500 text-base">💡</span>
                <p className="text-[12px] text-amber-700">
                  You have only <strong>{data.upcomingCount}</strong> post{data.upcomingCount !== 1 ? "s" : ""} scheduled
                  in the next 14 days. These ideas can help fill the gap.
                </p>
              </div>
            )}
            {data?.suggestions?.map((s, i) => (
              <SuggestionCard key={i} s={s} onUse={useInComposer} onBuildGraphic={buildGraphic} />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
