import { useState } from "react";
import { Sparkles, Square } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { getPlatformMeta } from "../shared/PlatformBadge.jsx";
import { useStreamCaption } from "../../hooks/useStreamCaption.js";

const CHAR_LIMITS = {
  facebook: 63206,
  instagram: 2200,
  youtube: 5000,
  tiktok: 2200,
};

function CharCounter({ count, limit }) {
  const pct = count / limit;
  const color = pct > 0.9 ? "#ef4444" : pct > 0.75 ? "#f59e0b" : "#9ca3af";
  return (
    <span className="text-[11px] font-mono" style={{ color }}>
      {count} / {limit.toLocaleString()}
    </span>
  );
}

export default function CaptionEditor({ platforms, captions, onChange }) {
  const [activeTab, setActiveTab] = useState(platforms[0] || "facebook");
  const [useGlobal, setUseGlobal] = useState(true);
  const [topic, setTopic] = useState("");
  const [showTopicInput, setShowTopicInput] = useState(false);

  const { stream, cancel, streaming } = useStreamCaption();

  const currentTab = platforms.includes(activeTab) ? activeTab : platforms[0];

  function handleChange(platform, value) {
    if (useGlobal) {
      const updated = {};
      platforms.forEach((p) => (updated[p] = value));
      onChange(updated);
    } else {
      onChange({ ...captions, [platform]: value });
    }
  }

  function toggleGlobal() {
    if (!useGlobal) {
      const text = captions[currentTab] || "";
      const updated = {};
      platforms.forEach((p) => (updated[p] = text));
      onChange(updated);
    }
    setUseGlobal(!useGlobal);
  }

  async function handleWrite() {
    if (streaming) {
      cancel();
      return;
    }
    if (!topic.trim()) {
      setShowTopicInput(true);
      return;
    }

    // Clear current caption then stream into it
    if (useGlobal) {
      const blank = {};
      platforms.forEach((p) => (blank[p] = ""));
      onChange(blank);
    } else {
      onChange({ ...captions, [currentTab]: "" });
    }

    let accumulated = "";
    await stream({
      topic,
      existingCaption: captions[currentTab]?.trim() || undefined,
      platform: currentTab,
      onChunk: (text) => {
        accumulated += text;
        if (useGlobal) {
          const updated = {};
          platforms.forEach((p) => (updated[p] = accumulated));
          onChange(updated);
        } else {
          onChange((prev) => ({ ...prev, [currentTab]: accumulated }));
        }
      },
    });
  }

  async function handleImprove() {
    const existing = captions[currentTab]?.trim();
    if (!existing || streaming) return;

    let accumulated = "";
    await stream({
      topic: topic || "improve this caption",
      existingCaption: existing,
      platform: currentTab,
      onChunk: (text) => {
        accumulated += text;
        if (useGlobal) {
          const updated = {};
          platforms.forEach((p) => (updated[p] = accumulated));
          onChange(updated);
        } else {
          onChange((prev) => ({ ...prev, [currentTab]: accumulated }));
        }
      },
    });
  }

  const text = captions[currentTab] || "";
  const limit = CHAR_LIMITS[currentTab] ?? 2200;
  const hasText = text.trim().length > 0;

  return (
    <div className="space-y-2">
      {/* Tabs + global toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {platforms.map((p) => {
            const meta = getPlatformMeta(p);
            const active = currentTab === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setActiveTab(p)}
                className={cn(
                  "px-2.5 py-1 text-[12px] font-medium rounded-md transition-all",
                  active ? "text-white" : "text-gray-400 hover:text-gray-700"
                )}
                style={active ? { background: meta.color } : {}}
              >
                {meta.short}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer select-none">
          <div
            onClick={toggleGlobal}
            className={cn(
              "relative h-4 w-7 rounded-full transition-colors duration-200 cursor-pointer",
              useGlobal ? "bg-indigo-500" : "bg-gray-300"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200",
                useGlobal ? "translate-x-3.5" : "translate-x-0.5"
              )}
            />
          </div>
          Same for all
        </label>
      </div>

      {/* Topic input for AI write */}
      {showTopicInput && (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setShowTopicInput(false); handleWrite(); }
              if (e.key === "Escape") setShowTopicInput(false);
            }}
            placeholder="What's this post about? e.g. Sunday service, Easter…"
            className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
          <button
            type="button"
            onClick={() => { setShowTopicInput(false); handleWrite(); }}
            className="px-3 py-2 rounded-lg text-[12px] font-medium text-white"
            style={{ background: "var(--brand-primary)" }}
          >
            Write
          </button>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => handleChange(currentTab, e.target.value)}
          placeholder={`Write your ${getPlatformMeta(currentTab).label} caption…`}
          rows={5}
          className={cn(
            "w-full resize-none rounded-xl border px-4 py-3 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:ring-2 transition-all leading-relaxed",
            streaming
              ? "border-indigo-300 focus:border-indigo-400 focus:ring-indigo-100 bg-indigo-50/30"
              : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-100"
          )}
        />

        {/* Streaming cursor */}
        {streaming && (
          <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 absolute" />
        )}

        <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
          {/* AI action buttons */}
          {hasText && !streaming && (
            <button
              type="button"
              onClick={handleImprove}
              className="text-[10px] font-medium text-indigo-400 hover:text-indigo-600 transition-colors px-1.5 py-0.5 rounded hover:bg-indigo-50"
            >
              ✦ Improve
            </button>
          )}
          <button
            type="button"
            onClick={handleWrite}
            title={streaming ? "Stop" : "Write with AI"}
            className={cn(
              "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
              streaming
                ? "text-red-400 hover:text-red-600 hover:bg-red-50"
                : "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50"
            )}
          >
            {streaming ? (
              <>
                <Square className="h-2.5 w-2.5" /> Stop
              </>
            ) : (
              <>
                <Sparkles className="h-2.5 w-2.5" /> Write
              </>
            )}
          </button>
          <CharCounter count={text.length} limit={limit} />
        </div>
      </div>

      {streaming && (
        <p className="text-[11px] text-indigo-500 flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
          AI is writing…
        </p>
      )}
    </div>
  );
}
