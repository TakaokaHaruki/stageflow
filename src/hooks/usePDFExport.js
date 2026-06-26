import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { generatePositionPDF } from "@/lib/pdfGenerator";

export function usePDFExport(eventId, type, filename) {
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    setExporting(true);
    try {
      // バックエンド関数でデータを一括取得し、クライアント側のAPI呼び出しを集約してレート制限を回避
      const res = await base44.functions.invoke("exportPositionPDF", { eventId, type });
      const { event, positions = [], staff = [] } = res?.data || {};
      const payload = { event, positions, staff, type };
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