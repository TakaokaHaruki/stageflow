import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import { toast } from "sonner";

export default function StaffQrPreviewModal({ staff, onClose }) {
  const canvasRef = useRef(null);
  const [dataUrl, setDataUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      try {
        const canvas = await QRCode.toCanvas(staff.acast_id, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (canvasRef.current) {
          canvasRef.current.innerHTML = "";
          canvasRef.current.appendChild(canvas);
        }
        setDataUrl(canvas.toDataURL("image/png"));
      } catch {
        toast.error("QR コードの生成に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [staff.acast_id]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `${staff.name}_QR.png`;
    link.href = dataUrl;
    link.click();
    toast.success(`${staff.name} の QR コードをダウンロードしました`);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] h-[100dvh] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-4 max-h-[90dvh] overflow-y-auto"
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            QR コードプレビュー
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 py-2">
          {loading ? (
            <div className="w-[300px] h-[300px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div ref={canvasRef} className="rounded-lg overflow-hidden border border-border" />
          )}

          <div className="text-center w-full">
            <p className="font-bold text-base">{staff.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">ID: {staff.acast_id}</p>
          </div>

          <Button className="w-full gap-2" onClick={handleDownload} disabled={!dataUrl}>
            <Download className="w-4 h-4" />
            ダウンロード
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}