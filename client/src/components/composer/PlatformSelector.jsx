import { cn } from "../../lib/utils.js";
import { getPlatformMeta } from "../shared/PlatformBadge.jsx";

const ALL_PLATFORMS = ["facebook", "instagram", "youtube", "tiktok"];

const PRESETS = [
  { label: "All", value: ALL_PLATFORMS },
  { label: "FB + IG", value: ["facebook", "instagram"] },
  { label: "Video", value: ["youtube", "tiktok"] },
];

export default function PlatformSelector({ selected, onChange }) {
  function toggle(platform) {
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  }

  function applyPreset(platforms) {
    onChange(platforms);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        {ALL_PLATFORMS.map((p) => {
          const meta = getPlatformMeta(p);
          const active = selected.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-150",
                active
                  ? "border-transparent text-white"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 bg-white"
              )}
              style={
                active
                  ? { background: meta.color, borderColor: meta.color }
                  : {}
              }
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: active ? "rgba(255,255,255,0.7)" : meta.color }}
              />
              {meta.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400 font-medium">Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.value)}
            className="text-[11px] text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
