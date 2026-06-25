import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { generatePositionPDF } from "@/lib/pdfGenerator";

export function usePDFExport(eventId, type, filename) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      // バックエンド関数を経由せず、フロントエンドから直接データ取得
      const [event, positions, staff] = await Promise.all([
        base44.entities.Event.get(eventId),
        base44.entities.Position.filter({ event_id: eventId }),
        base44.entities.Staff.filter({ event_id: eventId }),
      ]);

      const payload = { event, positions: positions || [], staff: staff || [], type };
      await generatePositionPDF(payload, filename);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("PDF作成に失敗しました: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  return { exporting, exportPDF };
}