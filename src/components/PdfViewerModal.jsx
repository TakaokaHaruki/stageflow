import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, FileWarning, ExternalLink, ZoomIn, ZoomOut, Maximize2, Hand } from "lucide-react";
import PdfCanvasViewer from "@/components/PdfCanvasViewer";

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
  const [scale, setScale] = useState(1);
  const [zoomMode, setZoomMode] = useState(false);
  const containerRef = useRef(null);
  const touchState = useRef({ initialDistance: 0, initialScale: 1 });
  const scaleRef = useRef(1);

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Pinch-to-zoom touch handlers (active only in zoom mode)
  useEffect(() => {
    if (!zoomMode) return;
    const container = containerRef.current;
    if (!container) return;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        touchState.current.initialDistance = getDistance(e.touches);
        touchState.current.initialScale = scaleRef.current;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchState.current.initialDistance > 0) {
        e.preventDefault();
        const ratio = getDistance(e.touches) / touchState.current.initialDistance;
        const newScale = Math.max(0.5, Math.min(5, touchState.current.initialScale * ratio));
        setScale(newScale);
        scaleRef.current = newScale;
      }
    };

    const handleTouchEnd = () => {
      if (touchState.current.initialDistance > 0) {
        touchState.current.initialDistance = 0;
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [zoomMode]);

  const zoomIn = () => setScale((s) => Math.min(5, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
  const resetZoom = () => setScale(1);
  const toggleZoomMode = () => {
    setZoomMode((prev) => {
      if (prev) setScale(1);
      return !prev;
    });
  };

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
        {fileType === "pdf" && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={zoomOut}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="縮小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground w-9 text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="拡大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="リセット"
              title="100%にリセット"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border mx-0.5" />
            <button
              onClick={toggleZoomMode}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${zoomMode ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
              aria-label="ピンチズーム切り替え"
              title={zoomMode ? "ピンチズームON中" : "ピンチズームを有効化"}
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
          aria-label="閉じる"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto flex flex-col items-center p-3">
        {fileType === "pdf" && (
          <div
            ref={containerRef}
            className="w-full max-w-3xl flex flex-col relative"
            style={{ touchAction: zoomMode ? "none" : "auto" }}
          >
            <PdfCanvasViewer fileUrl={fileUrl} zoomScale={scale} />
            {zoomMode && (
              <>
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium backdrop-blur-sm pointer-events-none whitespace-nowrap z-10">
                  ✋ ピンチでズーム
                </div>
                <div className="absolute top-3 right-3 z-10">
                  <button
                    onClick={toggleZoomMode}
                    className="px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium backdrop-blur-sm hover:bg-black/80 transition-colors"
                  >
                    終了
                  </button>
                </div>
              </>
            )}
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