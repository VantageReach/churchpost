import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, PenSquare, X } from "lucide-react";
import GraphicBuilderModal from "../components/graphicBuilder/GraphicBuilderModal.jsx";

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GraphicBuilderPage() {
  const navigate = useNavigate();
  const [exportedFile, setExportedFile] = useState(null);

  function handleExport(file) {
    setExportedFile(file);
  }

  function handleClose() {
    navigate(-1);
  }

  function handleCreatePost() {
    navigate("/compose", { state: { attachedFile: exportedFile } });
  }

  function handleDownload() {
    downloadFile(exportedFile);
    setExportedFile(null);
  }

  return (
    <>
      <GraphicBuilderModal open={true} onClose={handleClose} onExport={handleExport} />

      {/* Post-export action sheet */}
      {exportedFile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-2 flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">Graphic ready!</h3>
                <p className="text-[12px] text-gray-400 mt-0.5">What would you like to do with it?</p>
              </div>
              <button
                onClick={() => setExportedFile(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview thumbnail */}
            <div className="px-6 py-3">
              <img
                src={URL.createObjectURL(exportedFile)}
                alt="Exported graphic"
                className="w-full rounded-xl object-cover max-h-48 border border-gray-100"
              />
            </div>

            <div className="px-6 pb-6 space-y-2">
              <button
                onClick={handleCreatePost}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--brand-primary)" }}
              >
                <PenSquare className="h-4 w-4" />
                Create post with this image
              </button>
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download only
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
