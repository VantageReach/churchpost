import { useState } from "react";
import { Sparkles, Loader2, X, Download, PenSquare, RefreshCw, Wand2 } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import api from "../../lib/api.js";

const EXAMPLES = [
  "Sunday service announcement, modern and bold",
  "Church family dinner this Sunday at 5pm, warm and inviting",
  "Easter celebration graphic, sunrise and cross, gold tones",
  "Youth night event, energetic and vibrant",
  "Prayer & fasting week, peaceful and reverent",
];

export default function FullGraphicModal({ open, onClose, onUse }) {
  const { getToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);

  async function generate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const { data } = await api.post("/ai/generate-graphic", { prompt }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResultUrl(data.url);
    } catch (err) {
      setError(err?.response?.data?.error || "Generation failed. Try rephrasing your prompt.");
    } finally {
      setGenerating(false);
    }
  }

  function handleUse() {
    if (!resultUrl) return;
    // Convert data URL → File, pass to parent
    fetch(resultUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `ai-graphic-${Date.now()}.png`, { type: blob.type || "image/png" });
        onUse(file);
        onClose();
      });
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `ai-graphic-${Date.now()}.png`;
    a.click();
  }

  function tryAgain() {
    setResultUrl(null);
    setError(null);
  }

  function handleClose() {
    setResultUrl(null);
    setError(null);
    setPrompt("");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Wand2 className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900 leading-none">Generate Full Graphic</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">AI designs the complete image — text, layout, and all</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {!resultUrl ? (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Describe what you want... e.g. "Church Family Dinner this Sunday at 5pm, warm and inviting, dark green and gold"'
                rows={4}
                className="w-full text-[13px] rounded-xl border border-gray-200 px-3.5 py-3 resize-none outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder-gray-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                }}
              />

              {/* Example chips */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {error && (
                <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-[12px] text-red-600">{error}</p>
                </div>
              )}

              <button
                onClick={generate}
                disabled={!prompt.trim() || generating}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Designing your graphic…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate graphic
                  </>
                )}
              </button>

              {generating && (
                <p className="text-center text-[11px] text-gray-400 mt-2">This takes 15–30 seconds — hang tight</p>
              )}
            </>
          ) : (
            <>
              <img
                src={resultUrl}
                alt="AI generated graphic"
                className="w-full rounded-xl border border-gray-100 shadow-sm"
              />
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleUse}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--brand-primary)" }}
                >
                  <PenSquare className="h-4 w-4" />
                  Create post with this graphic
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={tryAgain}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
