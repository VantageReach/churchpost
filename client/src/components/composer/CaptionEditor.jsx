import { useState } from "react";
import { Sparkles, Square, X } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { getPlatformMeta } from "../shared/PlatformBadge.jsx";
import { useStreamCaption } from "../../hooks/useStreamCaption.js";
import { YOUTUBE_CATEGORIES } from "../../lib/postFormats.js";

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

function TagsInput({ tags, onChange }) {
  const [input, setInput] = useState("");

  function addTag(raw) {
    const tag = raw.trim().replace(/^,+|,+$/g, "");
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        Tags
      </label>
      <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-gray-200 bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all min-h-[40px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-gray-100 text-gray-700 text-[11px] font-medium px-2 py-0.5 rounded-full"
          >
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))}>
              <X className="h-2.5 w-2.5 text-gray-400 hover:text-gray-600" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (input) { addTag(input); setInput(""); } }}
          placeholder={tags.length === 0 ? "Add tags, press Enter…" : ""}
          className="flex-1 min-w-[120px] text-[13px] text-gray-700 placeholder-gray-400 outline-none bg-transparent"
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Separate with Enter or comma</p>
    </div>
  );
}

function YouTubeStandardFields({ meta, onMetaChange, description, onDescriptionChange }) {
  const yt = meta ?? { title: "", tags: [], category: "29", visibility: "public" };

  function update(field, value) {
    onMetaChange({ ...yt, [field]: value });
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Title <span className="text-red-400">*</span>
          </label>
          <span className={cn("text-[11px] font-mono", yt.title.length > 90 ? "text-red-500" : "text-gray-400")}>
            {yt.title.length} / 100
          </span>
        </div>
        <input
          type="text"
          value={yt.title}
          onChange={(e) => update("title", e.target.value.slice(0, 100))}
          placeholder="Your video title…"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Description</label>
          <CharCounter count={description.length} limit={5000} />
        </div>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe your video…"
          rows={5}
          className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-[14px] text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
        />
      </div>

      {/* Tags */}
      <TagsInput tags={yt.tags ?? []} onChange={(tags) => update("tags", tags)} />

      {/* Category + Visibility row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={yt.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full text-[13px] border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            {YOUTUBE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Visibility
          </label>
          <select
            value={yt.visibility}
            onChange={(e) => update("visibility", e.target.value)}
            className="w-full text-[13px] border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {/* Premiere toggle */}
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-gray-50 border border-gray-200">
        <div>
          <p className="text-[13px] font-medium text-gray-700">Premiere</p>
          <p className="text-[11px] text-gray-400">Schedule as a YouTube Premiere event</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={yt.premiere ?? false}
          onClick={() => update("premiere", !(yt.premiere ?? false))}
          className={cn(
            "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
            yt.premiere ? "bg-red-500" : "bg-gray-200"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
              yt.premiere ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </div>
    </div>
  );
}

export default function CaptionEditor({ platforms, captions, onChange, formats = {}, postMeta = {}, onMetaChange }) {
  const [activeTab, setActiveTab] = useState(platforms[0] || "facebook");
  const [useGlobal, setUseGlobal] = useState(true);
  const [topic, setTopic] = useState("");
  const [showTopicInput, setShowTopicInput] = useState(false);

  const { stream, cancel, streaming } = useStreamCaption();

  const currentTab = platforms.includes(activeTab) ? activeTab : platforms[0];
  const currentFormats = Array.isArray(formats[currentTab])
    ? formats[currentTab]
    : formats[currentTab] ? [formats[currentTab]] : [];
  const isYouTubeStandard = currentTab === "youtube" && currentFormats.includes("standard");
  const isStory = currentFormats.includes("story") && currentFormats.length === 1;

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
    if (streaming) { cancel(); return; }
    if (!topic.trim()) { setShowTopicInput(true); return; }

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
  const captionLimit = currentFormats.includes("short") && currentTab === "youtube"
    ? 100
    : (CHAR_LIMITS[currentTab] ?? 2200);
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
        {!isYouTubeStandard && (
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
        )}
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

      {/* YouTube Standard Video — special fields */}
      {isYouTubeStandard ? (
        <YouTubeStandardFields
          meta={postMeta?.youtube}
          onMetaChange={(meta) => onMetaChange?.("youtube", meta)}
          description={text}
          onDescriptionChange={(val) => onChange({ ...captions, youtube: val })}
        />
      ) : (
        <>
          {/* Standard textarea */}
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

            {streaming && (
              <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 absolute" />
            )}

            <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
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
                  <><Square className="h-2.5 w-2.5" /> Stop</>
                ) : (
                  <><Sparkles className="h-2.5 w-2.5" /> Write</>
                )}
              </button>
              <CharCounter count={text.length} limit={captionLimit} />
            </div>
          </div>

          {streaming && (
            <p className="text-[11px] text-indigo-500 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              AI is writing…
            </p>
          )}

          {/* Story note */}
          {isStory && (
            <p className="text-[11px] text-gray-400 flex items-start gap-1.5 px-1">
              <span className="mt-px text-amber-400">ⓘ</span>
              Stories disappear after 24 hours. Caption may not be visible depending on how the story is viewed.
            </p>
          )}

          {/* YouTube Short caption limit note */}
          {currentTab === "youtube" && currentFormats.includes("short") && (
            <p className="text-[11px] text-gray-400 px-1">
              ⓘ YouTube Shorts captions are limited to 100 characters.
            </p>
          )}

          {/* TikTok Photo Mode note */}
          {currentTab === "tiktok" && currentFormats.includes("photo_mode") && (
            <p className="text-[11px] text-gray-400 px-1">
              ⓘ Background music can be added in TikTok after posting.
            </p>
          )}
        </>
      )}
    </div>
  );
}
