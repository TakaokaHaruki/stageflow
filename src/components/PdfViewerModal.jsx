import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, FileWarning, Loader2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Configure worker once — use import.meta.url so Vite resolves the worker file path
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

function getFileType(url, fileName, forcePdf) {
  if (forcePdf) return "pdf";
  const lower = (url || "").toLowerCase().split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(lower)) return "image";
  if (/\.pdf$/i.test(lower)) return "pdf";
  if (fileName && /\.pdf/i.test(fileName.toLowerCase())) return "pdf";
  return "other";
}

function PdfCanvas({ fileUrl, onError }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [renderedPages, setRenderedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const renderPdf = async () => {
      setLoading(true);
      setError(false);
      setRenderedPages(0);
      setTotalPages(0);
      try {
        const pdf = await pdfjsLib.getDocument({ url: fileUrl }).promise;
        if (cancelled) return;
        setTotalPages(pdf.numPages);

        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = "";

        const containerWidth = container.clientWidth || window.innerWidth;
        const maxScale = 2.5;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(containerWidth / baseViewport.width, maxScale);
          const dpr = window.devicePixelRatio || 1;
          const renderScale = scale * dpr;
          const viewport = page.getViewport({ scale: renderScale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.style.display = "block";
          canvas.style.marginBottom = "6px";
          canvas.style.boxShadow = "0 1px 3px rgba(0,0,0,0.12)";
          canvas.style.borderRadius = "3px";
          canvas.style.background = "white";
          container.appendChild(canvas);

          await page.render({
            canvasContext: canvas.getContext("2d"),
            viewport,
          }).promise;
          setRenderedPages(i);
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        console.error("PDF render error:", err);
        if (!cancelled) {
          setError(true);
          onError?.();
        }
      }
    };

    renderPdf();
    return () => { cancelled = true; };
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-2 text-white/70">
        <Loader2 className="w-8 h-8 animate-spin" />
        {totalPages > 0
          ? <p className="text-sm">{renderedPages} / {totalPages} ページ読み込み中</p>
          : <p className="text-sm">PDFを読み込んでいます...</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 text-white/70 py-10">
        <FileWarning className="w-10 h-10" />
        <p className="text-sm">PDFの読み込みに失敗しました</p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          ファイルを開く
        </a>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full mx-auto" style={{ maxWidth: "800px" }} />;
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

      <div className="flex-1 overflow-y-auto flex justify-center p-3">
        {fileType === "pdf" && (
          <PdfCanvas fileUrl={fileUrl} />
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