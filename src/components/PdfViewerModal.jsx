import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, FileWarning, ExternalLink } from "lucide-react";

function getFileType(url, fileName, forcePdf) {
  if (forcePdf) return "pdf";
  const lower = (url || "").toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(lower)) return "image";
  if (/\.pdf$/i.test(lower)) return "pdf";
  if (fileName && /\.pdf/i.test(fileName.toLowerCase())) return "pdf";
  return "other";
}

export default function PdfViewerModal({ fileUrl, fileName, forcePdf, onClose }) {
  const fileType = getFileType(fileUrl, fileName, forcePdf);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col bg-black/85 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 bg-card border-b border-border shrink-0 safe-area-top">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate pr-2">{fileName || "ファイル"}</p>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col p-3">
        {fileType === "pdf" && (
          <div className="flex-1 flex flex-col min-h-0">
            <iframe
              src={fileUrl}
              className="flex-1 w-full rounded-lg bg-white shadow-2xl"
              title={fileName || "PDF"}
            />
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              別タブで開く
            </a>
          </div>
        )}

        {fileType === "image" && (
          <img
            src={fileUrl}
            alt={fileName || "画像"}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        )}

        {fileType === "other" && (
          <div className="flex flex-col items-center justify-center gap-3 text-white/70 py-20">
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