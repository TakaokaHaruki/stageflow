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
      let payload = unwrapFunctionResponse(response);
      // 二重ネスト対策: response.data.data 構造の場合はもう1段アンラップ
      if (payload?.data && !payload.positions && payload.data?.positions) {
        payload = payload.data;
      }
      console.log("[PDF Export] payload:", { positions: payload?.positions?.length, staff: payload?.staff?.length });
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