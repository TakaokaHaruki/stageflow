import { useMemo, useState } from "react";
import { FileText, Eye, Download, Loader2, FileStack, MapPin, ClipboardList } from "lucide-react";
import ModalShell, { ModalHeader, ModalFooter } from "@/components/ModalShell";
import { Button } from "@/components/ui/button";
import { usePdfExportData } from "@/hooks/usePdfExportData";
import { useDeviceAuth } from "@/hooks/useDeviceAuth";
import { invokeWithDevice } from "@/lib/deviceRequest";
import { generatePositionPDF, generateMapPDF } from "@/lib/pdfGenerator";
import { generateMeetingSheetPDF } from "@/lib/meetingSheetPdf";
import PdfViewerModal from "@/components/PdfViewerModal";
import { toast } from "sonner";

/**
 * PDF出力の統合メニュー。
 * 配置表・配置マップ・ミーティング用紙をチェックボックスで選択し、
 * 個別にプレビュー、または選択分を一括出力できる。
 */
export default function PdfExportMenu({ eventId, event, onClose }) {
  const { canAccess } = useDeviceAuth();
  const { sheets, sheetsLoading, positions, pins, mapSrc, hasMap } = usePdfExportData(eventId, event);

  const items = useMemo(() => {
    const list = [
      {
        id: "assignment",
        label: "配置表",
        icon: ClipboardList,
        available: positions.length > 0,
      },
      {
        id: "map",
        label: "配置マップ",
        icon: MapPin,
        available: hasMap,
      },
    ];
    for (const sheet of sheets) {
      list.push({
        id: `sheet_${sheet.id}`,
        label: `ミーティング用紙「${sheet.title || "無題"}」`,
        icon: FileStack,
        sheet,
        available: true,
      });
    }
    return list;
  }, [positions, hasMap, sheets]);

  const [selected, setSelected] = useState(() => new Set(items.filter((i) => i.available).map((i) => i.id)));
  const [generatingId, setGeneratingId] = useState(null);
  const [outputting, setOutputing] = useState(false);
  const [preview, setPreview] = useState(null); // { blobUrl, filename }

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateOne = async (item, { preview: isPreview }) => {
    if (!canAccess("export_pdf")) {
      toast.error("この機能は貸与端末限定です。管理者から貸与端末の認証URLを取得し、この端末で認証してください。");
      throw new Error("device_required");
    }
    if (item.id === "assignment") {
      const res = await invokeWithDevice("exportPositionPDF", { eventId, type: "staff" });
      const { event: ev, positions: ps = [], staff: sf = [] } = res?.data || {};
      return await generatePositionPDF({ event: ev, positions: ps, staff: sf, type: "staff" }, "配置表", { preview: isPreview });
    }
    if (item.id === "map") {
      return await generateMapPDF(
        {
          event,
          mapImage: mapSrc,
          pins: pins.map((p) => ({ position_name: p.position_name, map_x: p.map_x, map_y: p.map_y })),
          positions,
        },
        "配置マップ",
        { preview: isPreview }
      );
    }
    if (item.id.startsWith("sheet_")) {
      return await generateMeetingSheetPDF(item.sheet, { preview: isPreview });
    }
    return null;
  };

  const handlePreview = async (item) => {
    if (!item.available) return;
    setGeneratingId(item.id);
    try {
      const result = await generateOne(item, { preview: true });
      if (result?.blobUrl) setPreview(result);
    } catch (e) {
      if (e?.message !== "device_required") toast.error("プレビューの生成に失敗しました");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleOutput = async () => {
    const targets = items.filter((i) => selected.has(i.id) && i.available);
    if (targets.length === 0) {
      toast.error("出力するPDFを選択してください");
      return;
    }
    if (!canAccess("export_pdf")) {
      toast.error("この機能は貸与端末限定です。管理者から貸与端末の認証URLを取得し、この端末で認証してください。");
      return;
    }
    setOutputing(true);
    let ok = 0;
    for (const item of targets) {
      try {
        await generateOne(item, { preview: false });
        ok += 1;
      } catch (e) {
        if (e?.message === "device_required") break;
      }
    }
    setOutputing(false);
    if (ok > 0) toast.success(`${ok}件のPDFを出力しました`);
    if (ok === targets.length) onClose();
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <ModalHeader icon={<FileText className="w-5 h-5 text-primary" />} title="PDF出力" onClose={onClose} />

      <p className="text-xs text-muted-foreground mb-3">
        出力する種類を選択し、プレビューまたは出力してください。
      </p>

      <div className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const busy = generatingId === item.id;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                item.available
                  ? "border-border bg-card hover:bg-muted/40"
                  : "border-dashed border-border bg-muted/30 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                disabled={!item.available}
                className="h-4 w-4 shrink-0 accent-primary"
                id={`pdf-${item.id}`}
              />
              <label htmlFor={`pdf-${item.id}`} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{item.label}</span>
                {!item.available && (
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">データなし</span>
                )}
              </label>
              {item.available && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => handlePreview(item)}
                  disabled={busy || outputting}
                  title="プレビュー"
                  aria-label={`${item.label}をプレビュー`}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                </Button>
              )}
            </div>
          );
        })}
        {sheetsLoading && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={outputting}>
          キャンセル
        </Button>
        <Button className="flex-1 gap-1.5" onClick={handleOutput} disabled={outputting || generatingId !== null}>
          {outputting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {outputting ? "出力中..." : "選択したPDFを出力"}
        </Button>
      </ModalFooter>

      {preview && (
        <PdfViewerModal
          fileUrl={preview.blobUrl}
          fileName={preview.filename}
          forcePdf
          onClose={() => {
            try { URL.revokeObjectURL(preview.blobUrl); } catch {}
            setPreview(null);
          }}
        />
      )}
    </ModalShell>
  );
}