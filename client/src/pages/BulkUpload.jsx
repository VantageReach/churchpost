import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import {
  Upload, FileText, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Send, RefreshCw, Download,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import api from "../lib/api.js";
import PlatformBadge from "../components/shared/PlatformBadge.jsx";
import { cn } from "../lib/utils.js";

const TEMPLATE_CSV = `title,caption,platforms,scheduled_at,facebook_caption,instagram_caption
Sunday Service May 25,Join us this Sunday at 10am for worship and community!,facebook|instagram,2026-05-25 10:00,,
Easter Announcement,He is risen! Join us for our Easter celebration.,facebook|instagram|youtube,2026-04-20 09:00,Long version for Facebook — He is risen! We invite you to join us for a beautiful Easter Sunday celebration at 10am. Bring your family!,Short IG version 🌸 He is risen! Easter Sunday 10am. All are welcome!
Midweek Devotional,,facebook,2026-05-28 12:00,Sometimes all we need is a quiet moment with God. 🙏 Take a breath today — you are seen and loved.,
`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "churchpost-bulk-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function StatusIcon({ valid }) {
  return valid
    ? <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
    : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />;
}

function RowCard({ row, index }) {
  const [expanded, setExpanded] = useState(!row.valid);
  const firstCaption = Object.values(row.captions ?? {})[0] ?? "";

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden transition-colors",
      row.valid ? "border-gray-200 bg-white" : "border-red-200 bg-red-50/30"
    )}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <StatusIcon valid={row.valid} />
        <span className="text-[11px] font-bold text-gray-400 flex-shrink-0">
          Row {row.rowNum}
        </span>
        <span className="text-[13px] text-gray-700 truncate flex-1">
          {row.title || firstCaption || "—"}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {row.platforms?.map((p) => <PlatformBadge key={p} platform={p} size="sm" />)}
          {row.scheduledAt && (
            <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full">
              {new Date(row.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            row.status === "SCHEDULED" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
          )}>
            {row.status}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          {row.errors?.length > 0 && (
            <div className="space-y-1 pt-3">
              {row.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  {e}
                </div>
              ))}
            </div>
          )}
          {Object.entries(row.captions ?? {}).map(([platform, caption]) => (
            <div key={platform} className="space-y-1 pt-2">
              <PlatformBadge platform={platform} size="sm" />
              <p className="text-[12px] text-gray-600 leading-relaxed pl-1">{caption}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DropZone({ onFile }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"], "text/plain": [".csv"] },
    maxFiles: 1,
    onDrop: ([file]) => file && onFile(file),
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-150 py-16",
        isDragActive ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
      )}
    >
      <input {...getInputProps()} />
      <div className="h-14 w-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center">
        <Upload className={cn("h-6 w-6", isDragActive ? "text-indigo-500" : "text-gray-400")} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-gray-700">
          {isDragActive ? "Drop your CSV here" : "Drop a CSV file or click to browse"}
        </p>
        <p className="text-[12px] text-gray-400 mt-1">Max 500 rows · 5 MB</p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
        className="flex items-center gap-1.5 text-[12px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors mt-1"
      >
        <Download className="h-3.5 w-3.5" />
        Download template CSV
      </button>
    </div>
  );
}

export default function BulkUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [committed, setCommitted] = useState(null);
  const [filterErrors, setFilterErrors] = useState(false);

  const previewMutation = useMutation({
    mutationFn: (f) => {
      const form = new FormData();
      form.append("file", f);
      return api.post("/bulk-upload/preview", form, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data);
    },
    onSuccess: (data) => setPreview(data),
  });

  const commitMutation = useMutation({
    mutationFn: (rows) =>
      api.post("/bulk-upload/commit", {
        rows,
        filename: file?.name,
      }).then((r) => r.data),
    onSuccess: (data) => setCommitted(data),
  });

  function handleFile(f) {
    setFile(f);
    setPreview(null);
    setCommitted(null);
    previewMutation.mutate(f);
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setCommitted(null);
  }

  const displayRows = filterErrors
    ? preview?.rows?.filter((r) => !r.valid)
    : preview?.rows;

  // ── Success state ──────────────────────────────────────────────────────────
  if (committed) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="h-20 w-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <div className="text-center">
            <h2 className="text-[22px] font-display font-bold text-gray-900">
              {committed.created} post{committed.created !== 1 ? "s" : ""} created!
            </h2>
            <p className="text-[13px] text-gray-400 mt-1">
              All valid rows have been added to your posts queue.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/posts")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: "var(--brand-primary)" }}
            >
              <FileText className="h-4 w-4" />
              View Posts
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Upload another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4 lg:py-8 space-y-6">

          {/* Drop zone or file info */}
          {!file ? (
            <DropZone onFile={handleFile} />
          ) : (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{file.name}</p>
                  <p className="text-[11px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-[12px] font-medium text-gray-400 hover:text-gray-700 transition-colors"
              >
                Change file
              </button>
            </div>
          )}

          {/* Loading */}
          {previewMutation.isPending && (
            <div className="flex items-center justify-center py-12 gap-3">
              <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin" />
              <span className="text-[13px] text-gray-500">Parsing CSV…</span>
            </div>
          )}

          {/* Format guide — always visible */}
          <CsvFormatGuide />

          {/* Parse error */}
          {previewMutation.isError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
              {previewMutation.error?.response?.data?.error || "Failed to parse CSV"}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white border border-gray-200">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  {preview.validCount} valid
                </div>
                {preview.errorCount > 0 && (
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-red-500">
                    <XCircle className="h-4 w-4" />
                    {preview.errorCount} with errors
                  </div>
                )}
                <span className="text-[12px] text-gray-400">{preview.total} rows total</span>
                {preview.errorCount > 0 && (
                  <button
                    onClick={() => setFilterErrors(!filterErrors)}
                    className="ml-auto text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    {filterErrors ? "Show all" : "Show errors only"}
                  </button>
                )}
              </div>

              {/* Row list */}
              <div className="space-y-2">
                {displayRows?.map((row, i) => (
                  <RowCard key={i} row={row} index={i} />
                ))}
              </div>

              {/* Commit bar */}
              {preview.validCount > 0 && (
                <div className="sticky bottom-4 flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-200 shadow-lg">
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800">
                      Ready to create {preview.validCount} post{preview.validCount !== 1 ? "s" : ""}
                    </p>
                    {preview.errorCount > 0 && (
                      <p className="text-[12px] text-gray-400">
                        {preview.errorCount} row{preview.errorCount !== 1 ? "s" : ""} with errors will be skipped
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => commitMutation.mutate(preview.rows)}
                    disabled={commitMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-sm hover:opacity-90 transition-all disabled:opacity-50"
                    style={{ background: "var(--brand-primary)" }}
                  >
                    {commitMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {commitMutation.isPending ? "Creating posts…" : "Create posts"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3 px-4 lg:px-8 py-4 lg:py-5 border-b border-gray-100 bg-[#F7F7F5] flex-shrink-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm">
        <Upload className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 font-display leading-none">
          Bulk Upload
        </h1>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Schedule many posts at once via CSV
        </p>
      </div>
    </div>
  );
}

function CsvFormatGuide() {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-400">
          CSV Format Guide
        </h3>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-50">
          {/* Visual example */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400">Example CSV</p>
            <div className="rounded-lg bg-gray-950 overflow-x-auto">
              <pre className="text-[11px] font-mono text-gray-300 p-4 leading-relaxed whitespace-pre">{`title,caption,platforms,scheduled_at,facebook_caption,instagram_caption
Sunday Service,Join us this Sunday at 10am!,facebook|instagram,2026-05-25 10:00,,
Easter Sunday,,facebook|instagram,2026-04-20 09:00,He is risen! Join us for a beautiful Easter Sunday celebration at 10am — all are welcome! 🌸,He is risen! 🌸 Easter Sunday 10am. All welcome!
Midweek Devo,,facebook,2026-05-28 12:00,Take a breath today — you are seen and loved. 🙏,
No-date Draft,A post idea I'll schedule later,facebook|instagram,,, `}</pre>
            </div>
            <p className="text-[11px] text-gray-400">
              Row 1 uses a shared caption for both platforms. Rows 2–3 use per-platform captions. Row 4 saves as a draft (no date).
            </p>
          </div>

          {/* Column reference */}
          <div className="px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400 mb-2">Columns</p>
          </div>
          {[
            { col: "title", req: false, desc: "Optional label for your reference — not published" },
            { col: "caption", req: false, desc: "Shared caption for all selected platforms. Can be left blank if using per-platform captions below." },
            { col: "platforms", req: true, desc: "Which platforms to post to. Separate multiple with a pipe: facebook|instagram|youtube|tiktok" },
            { col: "scheduled_at", req: false, desc: 'Date and time to publish: 2026-05-25 10:00. Leave blank to save as a draft.' },
            { col: "facebook_caption", req: false, desc: "Caption used only for Facebook. Overrides the shared caption column." },
            { col: "instagram_caption", req: false, desc: "Caption used only for Instagram. Overrides the shared caption column." },
            { col: "youtube_caption", req: false, desc: "Caption used only for YouTube. Overrides the shared caption column." },
            { col: "tiktok_caption", req: false, desc: "Caption used only for TikTok. Overrides the shared caption column." },
          ].map(({ col, req, desc }) => (
            <div key={col} className="flex items-start gap-3 px-5 py-2.5 border-t border-gray-50">
              <code className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                {col}
              </code>
              {req
                ? <span className="text-[10px] font-bold text-red-400 bg-red-50 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">required</span>
                : <span className="text-[10px] text-gray-300 mt-1 flex-shrink-0">optional</span>
              }
              <span className="text-[12px] text-gray-500 leading-snug">{desc}</span>
            </div>
          ))}

          {/* Tips */}
          <div className="px-5 py-4 bg-amber-50 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-600">Tips</p>
            <ul className="space-y-1">
              {[
                "Build your CSV in Google Sheets, Excel, or Numbers — save as .csv before uploading",
                "If a caption contains a comma, wrap the whole cell in double quotes",
                "Max 500 rows per upload — split larger batches into multiple files",
                "Use the Download Template button above for a pre-formatted starting point",
              ].map((tip) => (
                <li key={tip} className="text-[12px] text-amber-700 flex items-start gap-1.5">
                  <span className="mt-0.5 flex-shrink-0">·</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
