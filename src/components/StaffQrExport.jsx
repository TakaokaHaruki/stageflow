import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import StaffQrPreviewModal from "@/components/StaffQrPreviewModal";

export default function StaffQrExport({ eventId }) {
  const [generating, setGenerating] = useState(false);
  const [previewStaff, setPreviewStaff] = useState(null);

  const generateQrImages = async (staffList) => {
    const canvasPromises = staffList.map((staff) => {
      return QRCode.toCanvas(staff.acast_id, {
        width: 200,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    });

    const canvases = await Promise.all(canvasPromises);
    return canvases.map((canvas, index) => ({
      canvas,
      staff: staffList[index],
    }));
  };

  const handleExportAllQr = async () => {
    if (!eventId) {
      toast.error("イベントが選択されていません");
      return;
    }

    setGenerating(true);
    try {
      const staffList = await base44.entities.Staff.filter({ event_id: eventId });
      
      if (!staffList || staffList.length === 0) {
        toast.error("スタッフが登録されていません");
        setGenerating(false);
        return;
      }

      const qrDataList = await generateQrImages(staffList);

      const qrWidth = 200;
      const qrHeight = 200;
      const padding = 40;
      const textHeight = 60;
      const cols = 3;
      const rows = Math.ceil(qrDataList.length / cols);
      
      const totalWidth = cols * (qrWidth + padding);
      const totalHeight = rows * (qrHeight + textHeight + padding);

      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = totalWidth;
      finalCanvas.height = totalHeight;
      const ctx = finalCanvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      qrDataList.forEach(({ canvas, staff }, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * (qrWidth + padding) + padding / 2;
        const y = row * (qrHeight + textHeight + padding) + padding / 2;

        ctx.drawImage(canvas, x, y, qrWidth, qrHeight);

        ctx.fillStyle = "#000000";
        ctx.font = "bold 16px 'Noto Sans JP', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(staff.name, x + qrWidth / 2, y + qrHeight + 25);
        
        ctx.font = "12px 'Noto Sans JP', sans-serif";
        ctx.fillStyle = "#666666";
        ctx.fillText(staff.acast_id, x + qrWidth / 2, y + qrHeight + 45);
      });

      const dataUrl = finalCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `staff_qr_codes_${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      link.click();

      toast.success(`${staffList.length} 名分の QR コードを出力しました`);
    } catch (e) {
      console.error("QR export error:", e);
      toast.error("QR コードの出力に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" />
          スタッフ QR コード出力
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          登録されているスタッフの A-CAST ID を QR コードとして出力します
        </p>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleExportAllQr}
            disabled={generating || !eventId}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {generating ? "出力中..." : "全スタッフの QR を出力"}
          </Button>
        </div>

        {!eventId && (
          <p className="text-xs text-destructive mt-2">
            イベントを選択してください
          </p>
        )}
      </div>

      {eventId && (
        <StaffQrList eventId={eventId} onPreview={setPreviewStaff} />
      )}

      {previewStaff && (
        <StaffQrPreviewModal staff={previewStaff} onClose={() => setPreviewStaff(null)} />
      )}
    </div>
  );
}

function StaffQrList({ eventId, onPreview }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staff = await base44.entities.Staff.filter({ event_id: eventId });
        setStaffList(staff || []);
      } catch (e) {
        console.error("Failed to fetch staff:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (staffList.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-muted-foreground">
        スタッフが登録されていません
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl divide-y divide-border">
      {staffList.map((staff) => (
        <div
          key={staff.id}
          className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
        >
          <div>
            <p className="text-sm font-medium">{staff.name}</p>
            <p className="text-xs text-muted-foreground">{staff.acast_id}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(staff)}
            className="gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            QR
          </Button>
        </div>
      ))}
    </div>
  );
}