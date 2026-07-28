import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, FileWarning } from "lucide-react";

function getFileType(url) {
  const lower = (url || "").toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(lower)) return "image";
  if (/\.pdf$/i.test(lower)) return "pdf";
  return "other";
}

export default function PdfViewerModal({ fileUrl, fileName, onClose }) {
  const [loading, setLoading] = useState(true);
  const fileType = getFileType(fileUrl);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-card border-b border-border shrink-0 safe-area-top">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{fileName || "ファイル"}</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-3">
        {fileType === "pdf" && !loading && (
          <iframe
            src={fileUrl}
            className="w-full h-full min-h-[75vh] bg-white rounded-lg"
            title={fileName || "PDF"}
          />
        )}

        {fileType === "image" && (
          <img
            src={fileUrl}
            alt={fileName || "画像"}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        )}

        {!loading && fileType === "other" && (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <FileWarning className="w-10 h-10" />
            <p className="text-sm">このファイル形式はプレビューできません</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              ファイルを開く
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );
}