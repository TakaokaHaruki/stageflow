import { useState } from "react";
import { invokeWithDevice } from "@/lib/deviceRequest";
import { generatePositionPDF } from "@/lib/pdfGenerator";
import { useDeviceAuth } from "@/hooks/useDeviceAuth";

export function usePDFExport(eventId, type, filename) {
  const [exporting, setExporting] = useState(false);
  const { canAccess } = useDeviceAuth();

  const exportPDF = async () => {
    if (!canAccess("export_pdf")) {
      alert("この機能は貸与端末限定です。管理者から貸与端末の認証URLを取得し、この端末で認証してください。");
      return;
    }
    setExporting(true);
    try {
      // バックエンド関数でデータを一括取得し、クライアント側のAPI呼び出しを集約してレート制限を回避
      const res = await invokeWithDevice("exportPositionPDF", { eventId, type });
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