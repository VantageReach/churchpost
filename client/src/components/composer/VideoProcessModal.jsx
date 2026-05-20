import { useState } from "react";
import { X, CheckCircle2, Scissors } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { RATIO_PREVIEW } from "../../lib/postFormats.js";
import api from "../../lib/api.js";

const RATIOS = ["9:16", "16:9", "1:1", "4:5"];

export default function VideoProcessModal({ asset, platform, format, aspectRatio, onApply, onClose }) {
  const [ratio, setRatio] = useState(aspectRatio ?? "9:16");
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  async function handleApply() {
    setError(null);
    setProcessing(true);
    try {
      const body = {
        assetId: asset.id,
        platform,
        format,
        aspectRatio: ratio,
        cropData: { zoom: 1, offsetX: 0, offsetY: 0 },
      };
      if (trimStart !== "") body.trimStart = Number(trimStart);
      if (trimEnd   !== "") body.trimEnd   = Number(trimEnd);

      const { data } = await api.post("/media/process-video", body);
      onApply({ platform, format, aspectRatio: ratio, variantUrl: data.url });
    } catch (err) {
      setError(err?.response?.data?.error || "Processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Process Video</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Crop and trim for{" "}
              <span className="capitalize">{platform} {format.replace("_", " ")}</span>
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ratio selection */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {RATIOS.map((r) => {
                const info = RATIO_PREVIEW[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRatio(r)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all",
                      ratio === r
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {/* Mini ratio preview */}
                    <div className="flex-shrink-0" style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div
                        className={cn("rounded-sm", ratio === r ? "bg-indigo-400" : "bg-gray-300")}
                        style={{
                          width:  info ? Math.round(18 * (info.w / Math.max(info.w, info.h))) : 18,
                          height: info ? Math.round(18 * (info.h / Math.max(info.w, info.h))) : 18,
                        }}
                      />
                    </div>
                    {info?.label ?? r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trim */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Scissors className="h-3 w-3" /> Trim (optional, seconds)
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 mb-1">Start</p>
                <input
                  type="number" min={0} step={0.1} placeholder="0"
                  value={trimStart}
                  onChange={(e) => setTrimStart(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 mb-1">End</p>
                <input
                  type="number" min={0} step={0.1} placeholder="e.g. 30"
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Leave blank to keep full duration.</p>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            Center crop is applied automatically. Original file is never modified. Processing may take up to 1–2 minutes for longer videos.
          </p>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-100 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleApply} disabled={processing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {processing ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Process Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
