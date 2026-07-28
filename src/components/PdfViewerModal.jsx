import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Loader2, FileWarning } from "lucide-react";

function getFileType(url) {
  const lower = (url || "").toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(lower)) return "image";
  if (/\.pdf$/i.test(lower)) return "pdf";
  return "other";
}

export default function PdfViewerModal({ fileUrl, fileName, onClose }) {
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rendering, setRendering] = useState(false);

  const fileType = getFileType(fileUrl);

  // Load PDF document
  useEffect(() => {
    if (fileType !== "pdf") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        const workerModule = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;

        // Fetch as ArrayBuffer first to avoid CORS issues with pdf.js worker
        let pdf;
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error("HTTP " + response.status);
          const arrayBuffer = await response.arrayBuffer();
          pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        } catch (fetchErr) {
          // Fallback: try direct URL load
          pdf = await pdfjsLib.getDocument(fileUrl).promise;
        }
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError("PDFの読み込みに失敗しました");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
      }
      if (pdfDocRef.current) {
        try { pdfDocRef.current.destroy(); } catch (_) {}
      }
    };
  }, [fileUrl, fileType]);

  const renderPage = useCallback(async (pageNum) => {
    if (!pdfDocRef.current || fileType !== "pdf") return;
    setRendering(true);
    try {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
      }
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      const maxWidth = Math.min(container?.clientWidth || window.innerWidth - 32, 900);
      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = Math.min(2.5, maxWidth / baseViewport.width);
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const viewport = page.getViewport({ scale: cssScale * dpr });
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${Math.round(baseViewport.width * cssScale)}px`;
      canvas.style.height = `${Math.round(baseViewport.height * cssScale)}px`;
      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (e) {
      if (e?.name !== "RenderingCancelledException") {
        setError("ページの描成に失敗しました");
      }
    } finally {
      setRendering(false);
    }
  }, [fileType]);

  useEffect(() => {
    if (fileType === "pdf" && !loading) {
      renderPage(currentPage);
    }
  }, [currentPage, loading, fileType, renderPage]);

  const goPrev = () => currentPage > 1 && setCurrentPage((p) => p - 1);
  const goNext = () => currentPage < numPages && setCurrentPage((p) => p + 1);

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
          {fileType === "pdf" && numPages > 0 && (
            <p className="text-[11px] text-muted-foreground">{numPages}ページ</p>
          )}
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
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">読み込み中...</p>
          </div>
        )}

        {error && (
          <div className="w-full h-full flex flex-col items-center">
            <object
              data={fileUrl}
              type="application/pdf"
              className="w-full h-full min-h-[60vh]"
              aria-label={fileName || "PDF"}
            >
              <div className="flex flex-col items-center gap-3 text-white/70 pt-12">
                <FileWarning className="w-10 h-10" />
                <p className="text-sm">{error}</p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  新しいタブで開く
                </a>
              </div>
            </object>
          </div>
        )}

        {!loading && !error && fileType === "pdf" && (
          <div className="relative flex flex-col items-center">
            <canvas ref={canvasRef} className="max-w-full h-auto shadow-2xl rounded-lg bg-white" />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        {!loading && !error && fileType === "image" && (
          <img
            src={fileUrl}
            alt={fileName || "画像"}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        )}

        {!loading && !error && fileType === "other" && (
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

      {/* Footer: page navigation */}
      {fileType === "pdf" && !loading && !error && numPages > 0 && (
        <div className="flex items-center justify-center gap-4 px-3 py-2.5 bg-card border-t border-border shrink-0 safe-area-bottom">
          <button
            onClick={goPrev}
            disabled={currentPage <= 1}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-muted hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold tabular-nums min-w-[60px] text-center">
            {currentPage} / {numPages}
          </span>
          <button
            onClick={goNext}
            disabled={currentPage >= numPages}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-muted hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}