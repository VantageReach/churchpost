import { useDropzone } from "react-dropzone";
import { Upload, X, Film, Image, PenSquare } from "lucide-react";
import { cn } from "../../lib/utils.js";

function MediaThumb({ asset, onRemove }) {
  const isVideo = asset.type === "VIDEO";
  const src = asset.url.startsWith("/") ? `http://localhost:3001${asset.url}` : asset.url;

  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
      {isVideo ? (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          <Film className="h-6 w-6 text-gray-400" />
          <span className="text-[10px] text-gray-400 truncate max-w-[80px] px-1 text-center">
            {asset.filename}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={asset.filename}
          className="h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onRemove(asset)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="absolute bottom-1 left-1">
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/50 text-white/80">
          {isVideo ? "VID" : "IMG"}
        </span>
      </div>
    </div>
  );
}

export default function MediaUpload({ assets, onAdd, onRemove, isUploading, onOpenGraphicBuilder }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/gif": [],
      "image/webp": [],
      "video/mp4": [],
      "video/quicktime": [],
    },
    maxFiles: 10 - assets.length,
    disabled: isUploading || assets.length >= 10,
    onDrop: (accepted) => onAdd(accepted),
  });

  return (
    <div className="space-y-3">
      {/* Action row: upload + build graphic */}
      {assets.length < 10 && (
        <div className="flex gap-2">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-all duration-150",
              isDragActive
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <input {...getInputProps()} />
            <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
              {isUploading ? (
                <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-indigo-500 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium text-gray-600">
                {isDragActive ? "Drop files here" : "Upload from device"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Images, video · {10 - assets.length} remaining
              </p>
            </div>
          </div>

          {/* Build graphic button */}
          <button
            type="button"
            onClick={onOpenGraphicBuilder}
            className="flex flex-col items-center justify-center gap-2 w-40 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all duration-150 px-4 py-6 group"
          >
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: "var(--brand-primary, #6366f1)18" }}
            >
              <PenSquare className="h-4 w-4 group-hover:text-indigo-600 text-gray-400 transition-colors" style={{ color: "var(--brand-primary, #6366f1)" }} />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">Build Graphic</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Canvas editor
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Thumbnail grid */}
      {assets.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {assets.map((asset, i) => (
            <MediaThumb key={asset.url ?? i} asset={asset} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}
