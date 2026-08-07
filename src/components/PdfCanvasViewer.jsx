import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSource from "@/lib/pdfWorkerSource";
import { FileWarning, Loader2 } from "lucide-react";

// ワーカーソースは既存の src/lib/pdfWorkerSource.js（pdfjs v4 同梱のワーカ文字列）を使用。
// Blob URL 化して workerSrc に設定することで、バンドラの解決問題を回避する。
let workerUrl = null;
function getWorkerUrl() {
  if (!workerUrl) {
    workerUrl = URL.createObjectURL(new Blob([pdfWorkerSource], { type: "text/javascript" }));
  }
  return workerUrl;
}
pdfjsLib.GlobalWorkerOptions.workerSrc = getWorkerUrl();

const MAX_DPR = 3;

export default function PdfCanvasViewer({ fileUrl, zoomScale, onStatus }) {
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [pages, setPages] = useState([]); // [{ canvas, cssWidth }]
  const renderTaskRef = useRef(null);
  const aliveRef = useRef(true);

  useEffect(() => { onStatus?.(status); }, [status, onStatus]);

  useEffect(() => {
    aliveRef.current = true;
    setStatus("loading");
    setPages([]);

    const pdfDocRef = { current: null };
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(fileUrl, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.arrayBuffer();
        if (cancelled || !aliveRef.current) return;

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled || !aliveRef.current) { pdf.destroy(); return; }
        pdfDocRef.current = pdf;

        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
        const rendered = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled || !aliveRef.current) return;
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: dpr });
          const canvas = document.createElement("canvas");
          canvas.className = "pdf-canvas-page";
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          const ctx = canvas.getContext("2d", { alpha: false });
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const renderTask = page.render({ canvasContext: ctx, canvas, viewport });
          renderTaskRef.current = renderTask;
          await renderTask.promise;
          renderTaskRef.current = null;
          if (cancelled || !aliveRef.current) return;
          rendered.push({ canvas, cssWidth: baseViewport.width });
          setPages([...rendered]);
        }
        if (cancelled || !aliveRef.current) return;
        setStatus("ready");
      } catch (e) {
        if (cancelled || !aliveRef.current) return;
        console.error("PdfCanvasViewer load error:", e);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      aliveRef.current = false;
      renderTaskRef.current?.cancel?.();
      pdfDocRef.current?.destroy?.();
    };
  }, [fileUrl]);

  return (
    <div
      className="flex flex-col items-center"
      style={{ transform: `scale(${zoomScale})`, transformOrigin: "center top" }}
    >
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-white/80">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">PDFを読み込んでいます...</p>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-white/80 px-4">
          <FileWarning className="w-10 h-10" />
          <p className="text-sm text-center">PDFを読み込めませんでした</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
          >
            別タブで開く
          </a>
        </div>
      )}

      {status !== "error" && pages.map((p, idx) => (
        <div
          key={idx}
          className={idx === pages.length - 1 ? "" : "mb-2"}
          style={{ width: "100%" }}
          ref={(el) => {
            if (el && !el.contains(p.canvas)) {
              el.innerHTML = "";
              el.appendChild(p.canvas);
            }
          }}
        />
      ))}
    </div>
  );
}