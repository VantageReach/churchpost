import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, FlipHorizontal, Maximize, Minimize } from "lucide-react";
import { cn } from "../../lib/utils.js";
import { RATIO_PREVIEW } from "../../lib/postFormats.js";
import api from "../../lib/api.js";

const STAGE_SIZE = 400;

function parsedRatio(ratioStr) {
  const [w, h] = (ratioStr ?? "1:1").split(":").map(Number);
  return { w, h, aspect: w / h };
}

function computeFrame(ratioStr) {
  const { w, h, aspect } = parsedRatio(ratioStr);
  let fw, fh;
  if (aspect >= 1) {
    fw = STAGE_SIZE;
    fh = Math.round(STAGE_SIZE / aspect);
  } else {
    fh = STAGE_SIZE;
    fw = Math.round(STAGE_SIZE * aspect);
  }
  return { fw, fh, fl: (STAGE_SIZE - fw) / 2, ft: (STAGE_SIZE - fh) / 2 };
}

export default function CropModal({ asset, platform, format, aspectRatio, onApply, onClose }) {
  const imgRef = useRef(null);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // normalized fraction of natW
  const [offsetY, setOffsetY] = useState(0); // normalized fraction of natH
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const dragRef = useRef(null);

  const ratio = aspectRatio ?? "1:1";
  const { fw, fh, fl, ft } = computeFrame(ratio);
  const ratioPreview = RATIO_PREVIEW[ratio];

  function onImageLoad(e) {
    setNaturalW(e.target.naturalWidth);
    setNaturalH(e.target.naturalHeight);
  }

  // Compute display scale: at zoom=1 the image just fills the frame (auto-fill)
  const natAspect = naturalW / (naturalH || 1);
  const frameAspect = parsedRatio(ratio).aspect;
  let fillScale;
  if (natAspect > frameAspect) {
    fillScale = fh / (naturalH || 1);
  } else {
    fillScale = fw / (naturalW || 1);
  }
  const displayScale = fillScale * zoom;
  const dispW = naturalW * displayScale;
  const dispH = naturalH * displayScale;

  // Image transform in stage coordinates
  // Image center at stage center + stage offset for frame center
  const stageCX = STAGE_SIZE / 2;
  const stageCY = STAGE_SIZE / 2;
  const imgLeft = stageCX - dispW / 2 + offsetX * naturalW * displayScale;
  const imgTop  = stageCY - dispH / 2 + offsetY * naturalH * displayScale;

  // ── Drag handlers ──
  const handlePointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    };
  }, [offsetX, offsetY]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current || !naturalW) return;
    const dx = (e.clientX - dragRef.current.startX) / (naturalW * displayScale);
    const dy = (e.clientY - dragRef.current.startY) / (naturalH * displayScale);
    setOffsetX(dragRef.current.startOffsetX + dx);
    setOffsetY(dragRef.current.startOffsetY + dy);
  }, [naturalW, naturalH, displayScale]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Wheel zoom ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(4, z - e.deltaY * 0.001)));
  }, []);

  function autoFill() {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  function autoFit() {
    const natAsp = naturalW / (naturalH || 1);
    const frameAsp = parsedRatio(ratio).aspect;
    // Fit means letterbox — zoom so the image fits WITHIN the frame
    let fitScale;
    if (natAsp > frameAsp) {
      fitScale = fw / (naturalW || 1);
    } else {
      fitScale = fh / (naturalH || 1);
    }
    const relZoom = fitScale / (fillScale || 1);
    setZoom(Math.max(0.1, relZoom));
    setOffsetX(0);
    setOffsetY(0);
  }

  function reset() {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setRotation(0);
    setFlipH(false);
  }

  async function handleApply() {
    setError(null);
    setApplying(true);
    try {
      const cropData = { zoom, offsetX, offsetY, rotation: flipH ? -rotation : rotation };
      const { data } = await api.post("/media/crop", {
        assetId: asset.id,
        platform,
        format,
        aspectRatio: ratio,
        cropData,
      });
      onApply({ platform, format, aspectRatio: ratio, variantUrl: data.url, cropData });
    } catch (err) {
      setError(err?.response?.data?.error || "Crop failed. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  const imgSrc = asset.url.startsWith("/") ? `http://localhost:3001${asset.url}` : asset.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Crop Image</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {ratioPreview?.label ?? ratio} for{" "}
              <span className="capitalize">{platform} {format.replace("_", " ")}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row">
          {/* Crop canvas */}
          <div className="flex-1 flex items-center justify-center p-6 bg-gray-900">
            <div
              className="relative select-none cursor-grab active:cursor-grabbing"
              style={{ width: STAGE_SIZE, height: STAGE_SIZE, overflow: "hidden", borderRadius: 8 }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* Background (dim) */}
              <div className="absolute inset-0 bg-black/60" />

              {/* Image */}
              {naturalW > 0 && (
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: imgLeft,
                    top: imgTop,
                    width: dispW,
                    height: dispH,
                    transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
                    transformOrigin: "center center",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                />
              )}
              {/* Hidden img to get natural dimensions */}
              <img
                src={imgSrc}
                alt=""
                onLoad={onImageLoad}
                className="hidden"
              />

              {/* Crop frame overlay — outline creates the dim area outside */}
              <div
                style={{
                  position: "absolute",
                  left: fl,
                  top: ft,
                  width: fw,
                  height: fh,
                  outline: "2000px solid rgba(0,0,0,0.5)",
                  border: "2px solid rgba(255,255,255,0.8)",
                  pointerEvents: "none",
                  boxSizing: "content-box",
                }}
              >
                {/* Rule-of-thirds grid */}
                <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
                  {[1/3, 2/3].map((p) => (
                    <div key={`h-${p}`} className="absolute left-0 right-0 border-t border-white" style={{ top: `${p * 100}%` }} />
                  ))}
                  {[1/3, 2/3].map((p) => (
                    <div key={`v-${p}`} className="absolute top-0 bottom-0 border-l border-white" style={{ left: `${p * 100}%` }} />
                  ))}
                </div>
                {/* Corner handles */}
                {[
                  { t: -2, l: -2, borderT: "2px solid white", borderL: "2px solid white" },
                  { t: -2, r: -2, borderT: "2px solid white", borderR: "2px solid white" },
                  { b: -2, l: -2, borderB: "2px solid white", borderL: "2px solid white" },
                  { b: -2, r: -2, borderB: "2px solid white", borderR: "2px solid white" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="absolute w-5 h-5 pointer-events-none"
                    style={{
                      top: s.t, bottom: s.b, left: s.l, right: s.r,
                      borderTop: s.borderT, borderBottom: s.borderB,
                      borderLeft: s.borderL, borderRight: s.borderR,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Controls panel */}
          <div className="w-full sm:w-56 flex flex-col gap-4 p-5 border-t sm:border-t-0 sm:border-l border-gray-100 bg-gray-50/50">
            {/* Zoom */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Zoom — {Math.round(zoom * 100)}%
              </label>
              <input
                type="range"
                min={50} max={400} step={1}
                value={Math.round(zoom * 100)}
                onChange={(e) => setZoom(Number(e.target.value) / 100)}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>50%</span><span>400%</span>
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Rotation — {rotation}°
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRotation((r) => r - 90)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> −90°
                </button>
                <button type="button" onClick={() => setRotation((r) => r + 90)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-600 hover:bg-gray-50 transition-colors">
                  <RotateCw className="h-3.5 w-3.5" /> +90°
                </button>
              </div>
            </div>

            {/* Flip */}
            <button type="button" onClick={() => setFlipH((f) => !f)}
              className={cn(
                "flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[12px] font-medium transition-colors",
                flipH ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              )}>
              <FlipHorizontal className="h-3.5 w-3.5" /> Flip horizontal
            </button>

            {/* Fill / Fit */}
            <div className="flex gap-2">
              <button type="button" onClick={autoFill}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:bg-gray-50 transition-colors">
                <Maximize className="h-3 w-3" /> Fill
              </button>
              <button type="button" onClick={autoFit}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:bg-gray-50 transition-colors">
                <Minimize className="h-3 w-3" /> Fit
              </button>
            </div>

            {/* Reset */}
            <button type="button" onClick={reset}
              className="py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] text-gray-500 hover:bg-gray-50 transition-colors">
              Reset
            </button>

            <p className="text-[10px] text-gray-400 leading-relaxed">
              Drag to reposition · Scroll to zoom · Original file is never modified.
            </p>
          </div>
        </div>

        {/* Footer */}
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
          <button type="button" onClick={handleApply} disabled={applying || naturalW === 0}
            className="px-5 py-2 rounded-xl text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {applying ? "Processing…" : "Apply crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
