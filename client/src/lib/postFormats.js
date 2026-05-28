import { LayoutGrid, Smartphone, Play, Layers, Video, Images } from "lucide-react";

export const PLATFORM_FORMATS = {
  facebook: [
    {
      key: "feed_post", label: "Feed Post", icon: LayoutGrid, default: true,
      supports: ["text", "image", "video", "link"],
      ratios: ["4:5", "1:1", "1.91:1"], recommendedRatio: "4:5",
    },
    {
      key: "story", label: "Story", icon: Smartphone,
      supports: ["image", "video"],
      ratios: ["9:16"], required: true, maxVideoSec: 60, disappears: true,
    },
    {
      key: "reel", label: "Reel", icon: Play,
      supports: ["video"],
      ratios: ["9:16"], required: true, maxVideoSec: 90,
    },
    {
      key: "watch_video", label: "Watch Video", icon: Video,
      supports: ["video"],
      ratios: ["16:9"], minVideoSec: 180,
    },
  ],
  instagram: [
    {
      key: "feed_post", label: "Feed Post", icon: LayoutGrid, default: true,
      supports: ["image", "video", "multiple"],
      ratios: ["4:5", "1:1", "1.91:1"], recommendedRatio: "4:5", maxVideoSec: 60,
    },
    {
      key: "story", label: "Story", icon: Smartphone,
      supports: ["image", "video"],
      ratios: ["9:16"], required: true, maxVideoSec: 60, disappears: true,
    },
    {
      key: "reel", label: "Reel", icon: Play,
      supports: ["video"],
      ratios: ["9:16"], required: true, maxVideoSec: 90,
    },
    {
      key: "carousel", label: "Carousel", icon: Layers,
      supports: ["image", "video"],
      ratios: ["1:1", "4:5"], recommendedRatio: "1:1", minItems: 2, maxItems: 10,
    },
  ],
  youtube: [
    {
      key: "standard", label: "Standard Video", icon: Video, default: true,
      supports: ["video"],
      ratios: ["16:9"], required: true,
    },
    {
      key: "short", label: "Short", icon: Play,
      supports: ["video"],
      ratios: ["9:16"], required: true, maxVideoSec: 60, captionLimit: 100,
    },
  ],
  tiktok: [
    {
      key: "standard", label: "Standard Video", icon: Play, default: true,
      supports: ["video"],
      ratios: ["9:16"], required: true, maxVideoSec: 600,
    },
    {
      key: "photo_mode", label: "Photo Mode", icon: Images,
      supports: ["image"],
      ratios: ["1:1", "9:16"], recommendedRatio: "9:16", minItems: 2, maxItems: 35,
    },
  ],
};

export function getFormatConfig(platform, formatKey) {
  return PLATFORM_FORMATS[platform]?.find((f) => f.key === formatKey) ?? null;
}

export function getDefaultFormat(platform) {
  const fmts = PLATFORM_FORMATS[platform];
  return fmts?.find((f) => f.default)?.key ?? fmts?.[0]?.key ?? "feed_post";
}

export function buildDefaultFormats(platforms) {
  const result = {};
  platforms.forEach((p) => { result[p] = getDefaultFormat(p); });
  return result;
}

export function getFormatWarnings(platform, formatKey, mediaAssets = []) {
  const config = getFormatConfig(platform, formatKey);
  if (!config) return [];

  const warnings = [];
  const mediaCount = mediaAssets.length;
  const videoAsset = mediaAssets.find((a) => a.type === "VIDEO");
  const videoDurationSec = videoAsset?.duration ?? null;

  // Requires media
  const requiresMedia = ["story", "reel", "short", "watch_video"].includes(formatKey) ||
    (platform === "tiktok" && formatKey === "standard");
  if (requiresMedia && mediaCount === 0) {
    warnings.push({ id: "media_required", message: `${config.label}s require a photo or video.` });
  }

  // Video too long
  if (config.maxVideoSec && videoDurationSec !== null && videoDurationSec > config.maxVideoSec) {
    const max = config.maxVideoSec >= 60
      ? `${Math.round(config.maxVideoSec / 60)} min`
      : `${config.maxVideoSec} sec`;
    warnings.push({ id: "video_too_long", message: `${config.label} max ${max} — trim your video.`, action: "trim" });
  }

  // Video too short (Facebook Watch)
  if (config.minVideoSec && videoDurationSec !== null && videoDurationSec < config.minVideoSec) {
    warnings.push({ id: "video_too_short", message: "Facebook Watch requires 3+ minute videos." });
  }

  // Carousel / slideshow item counts
  if (config.minItems && mediaCount > 0 && mediaCount < config.minItems) {
    warnings.push({ id: "too_few_items", message: `Add at least ${config.minItems} items for a ${config.label.toLowerCase()}.` });
  }
  if (config.maxItems && mediaCount > config.maxItems) {
    warnings.push({ id: "too_many_items", message: `${config.label} max ${config.maxItems} items — remove some.` });
  }

  return warnings;
}

// Aspect ratio preview dimensions for the post preview frame
export const RATIO_PREVIEW = {
  "9:16":   { w: 9,    h: 16, label: "Vertical (9:16)" },
  "16:9":   { w: 16,   h: 9,  label: "Landscape (16:9)" },
  "1:1":    { w: 1,    h: 1,  label: "Square (1:1)" },
  "4:5":    { w: 4,    h: 5,  label: "Portrait (4:5)" },
  "1.91:1": { w: 1.91, h: 1,  label: "Landscape (1.91:1)" },
};

export const YOUTUBE_CATEGORIES = [
  { value: "1",  label: "Film & Animation" },
  { value: "10", label: "Music" },
  { value: "22", label: "People & Blogs" },
  { value: "23", label: "Comedy" },
  { value: "24", label: "Entertainment" },
  { value: "25", label: "News & Politics" },
  { value: "26", label: "Howto & Style" },
  { value: "27", label: "Education" },
  { value: "28", label: "Science & Technology" },
  { value: "29", label: "Nonprofits & Activism" },
];
