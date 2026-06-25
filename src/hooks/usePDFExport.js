import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import { generatePositionPDF } from "@/lib/pdfGenerator";

export function usePDFExport(eventId, type, filename) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke("exportPositionPDF", { eventId, type });
      const payload = unwrapFunctionResponse(response);
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