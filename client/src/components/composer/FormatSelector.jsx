import { AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { getPlatformMeta } from "../shared/PlatformBadge.jsx";
import { PLATFORM_FORMATS, getFormatWarnings, RATIO_PREVIEW } from "../../lib/postFormats.js";

function FormatPill({ fmt, active, onClick, platformColor }) {
  const Icon = fmt.icon;
  const ratio = fmt.ratios?.[fmt.ratios.length - 1];
  const preview = ratio ? RATIO_PREVIEW[ratio] : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-150 whitespace-nowrap",
        active
          ? "border-transparent text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
      )}
      style={active ? { background: platformColor } : {}}
    >
      {/* Aspect ratio thumbnail */}
      {preview && (
        <span
          className={cn(
            "inline-flex items-center justify-center flex-shrink-0 rounded-[2px] border",
            active ? "border-white/40 bg-white/20" : "border-gray-300 bg-gray-100"
          )}
          style={{
            width: preview.w <= preview.h ? "8px" : "12px",
            height: preview.w <= preview.h ? "12px" : "8px",
          }}
        />
      )}
      <Icon className="h-3 w-3 flex-shrink-0" />
      {fmt.label}
    </button>
  );
}

function WarningBadge({ warning }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 shrink-0" />
      <span className="text-[12px] text-amber-700 flex-1">{warning.message}</span>
      {warning.action === "trim" && (
        <button
          type="button"
          className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 whitespace-nowrap flex-shrink-0"
        >
          Fix this
        </button>
      )}
    </div>
  );
}

export default function FormatSelector({ platforms, formats, mediaAssets, onFormatChange }) {
  if (!platforms.length) return null;

  const multiPlatform = platforms.length > 1;

  return (
    <div className="space-y-3">
      {platforms.map((platform) => {
        const meta = getPlatformMeta(platform);
        const platformFormats = PLATFORM_FORMATS[platform] ?? [];
        const activeFormat = formats[platform];
        const warnings = getFormatWarnings(platform, activeFormat, mediaAssets);

        return (
          <div key={platform} className="space-y-2">
            {multiPlatform && (
              <p
                className="text-[10px] font-bold uppercase tracking-[0.08em] flex items-center gap-1.5"
                style={{ color: meta.color }}
              >
                {meta.label}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {platformFormats.map((fmt) => (
                <FormatPill
                  key={fmt.key}
                  fmt={fmt}
                  active={activeFormat === fmt.key}
                  onClick={() => onFormatChange(platform, fmt.key)}
                  platformColor={meta.color}
                />
              ))}
            </div>

            {warnings.length > 0 && (
              <div className="space-y-1.5">
                {warnings.map((w) => (
                  <WarningBadge key={w.id} warning={w} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
