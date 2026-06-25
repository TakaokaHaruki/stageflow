import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { generatePositionPDF } from "@/lib/pdfGenerator";

export function usePDFExport(eventId, type, filename) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke("exportPositionPDF", { eventId, type });
      // response が {data: {...}} 形式か、直接 {positions, staff, event} 形式かに対応
      const payload = (response?.positions || response?.staff) ? response : (response?.data ?? response);
      if (payload.error) {
        alert("エラー: " + payload.error);
        return;
      }
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