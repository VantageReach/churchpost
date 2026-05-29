import { CheckCircle2, AlertCircle, Crop } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { getPlatformMeta } from "../shared/PlatformBadge.jsx";
import { getFormatConfig, getFormatsArray, RATIO_PREVIEW } from "../../lib/postFormats.js";

function CropChip({ platform, format, ratio, status, onClick }) {
  const meta = getPlatformMeta(platform);
  const fmtConfig = getFormatConfig(platform, format);
  const ratioInfo = RATIO_PREVIEW[ratio];

  const stateStyle = {
    cropped: "border-emerald-300 bg-emerald-50 text-emerald-700",
    needed:  "border-amber-300 bg-amber-50 text-amber-700",
    auto:    "border-gray-200 bg-gray-50 text-gray-500",
  };

  const StatusIcon = status === "cropped" ? CheckCircle2 : status === "needed" ? AlertCircle : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all hover:shadow-sm",
        stateStyle[status] ?? stateStyle.auto
      )}
    >
      {StatusIcon && <StatusIcon className="h-3.5 w-3.5 flex-shrink-0" />}
      <div className="text-left">
        <p className="font-semibold leading-none" style={{ color: meta.color }}>
          {meta.short}
        </p>
        <p className="text-[10px] mt-0.5 opacity-80">{fmtConfig?.label ?? format} · {ratio}</p>
      </div>
      <Crop className="h-3 w-3 ml-1 opacity-60" />
    </button>
  );
}

export default function FormatPackPanel({ platforms, formats, assets, cropVariants, onCropRequest }) {
  if (!assets.length) return null;
  const imageAssets = assets.filter((a) => a.type === "IMAGE");
  if (!imageAssets.length) return null;

  // Build list of unique (platform, format, ratio) combinations that need crops
  const cropNeeds = [];
  const seen = new Set();

  platforms.forEach((platform) => {
    const fmtArray = getFormatsArray(formats, platform);
    fmtArray.forEach((format) => {
      const config = getFormatConfig(platform, format);
      if (!config) return;
      const primaryRatio = config.recommendedRatio ?? config.ratios?.[0] ?? "1:1";
      const key = `${platform}__${format}__${primaryRatio}`;
      if (!seen.has(key)) {
        seen.add(key);
        cropNeeds.push({ platform, format, ratio: primaryRatio });
      }
    });
  });

  // Deduplicate by ratio — if two platform/format combos share a ratio,
  // cropping one satisfies the other
  const uniqueRatios = [...new Set(cropNeeds.map((c) => c.ratio))];
  if (uniqueRatios.length <= 1) return null; // only 1 ratio needed, no format pack needed

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Crop className="h-4 w-4 text-gray-400" />
        <div>
          <p className="text-[13px] font-semibold text-gray-800">Format pack</p>
          <p className="text-[11px] text-gray-400">Each format needs its own crop. Click to adjust.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {cropNeeds.map(({ platform, format, ratio }) => {
          const variantKey = `${assets[0]?.id ?? ""}__${platform}__${format}`;
          const status = cropVariants[variantKey] ? "cropped" : "needed";
          return (
            <CropChip
              key={variantKey}
              platform={platform}
              format={format}
              ratio={ratio}
              status={status}
              onClick={() => onCropRequest(assets[0], platform, format, ratio)}
            />
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400">
        ✓ cropped &nbsp;·&nbsp; ⚠ needs crop &nbsp;·&nbsp; Clicking uses the first image. Original is never modified.
      </p>
    </div>
  );
}
