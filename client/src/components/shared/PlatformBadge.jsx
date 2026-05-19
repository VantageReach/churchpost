import { cn } from "../../lib/utils.js";

const PLATFORMS = {
  facebook: { label: "Facebook", short: "FB", color: "#1877F2", bg: "rgba(24,119,242,0.12)" },
  instagram: { label: "Instagram", short: "IG", color: "#E1306C", bg: "rgba(225,48,108,0.12)" },
  youtube: { label: "YouTube", short: "YT", color: "#FF0000", bg: "rgba(255,0,0,0.12)" },
  tiktok: { label: "TikTok", short: "TT", color: "#69C9D0", bg: "rgba(105,201,208,0.12)" },
};

export function getPlatformMeta(platform) {
  return PLATFORMS[platform.toLowerCase()] ?? {
    label: platform,
    short: platform.slice(0, 2).toUpperCase(),
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
  };
}

export default function PlatformBadge({ platform, size = "sm", className }) {
  const meta = getPlatformMeta(platform);
  const isLg = size === "lg";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        isLg ? "px-3 py-1 text-[13px]" : "px-2 py-0.5 text-[11px]",
        className
      )}
      style={{ background: meta.bg, color: meta.color }}
    >
      <span
        className={cn("rounded-full flex-shrink-0", isLg ? "h-2 w-2" : "h-1.5 w-1.5")}
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}
