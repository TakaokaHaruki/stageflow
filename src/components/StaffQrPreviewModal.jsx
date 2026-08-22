import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";
import ModalShell, { ModalHeader } from "@/components/ModalShell";
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
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <ModalHeader
        icon={<QrCode className="w-5 h-5 text-primary" />}
        title="QR コードプレビュー"
        onClose={onClose}
      />
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
    </ModalShell>
  );
}