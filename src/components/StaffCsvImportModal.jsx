import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bug, Upload, X, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

const SAMPLE = "名前,備考,acast_id\n山田太郎,,\n佐藤花子,リーダー,";

export default function StaffCsvImportModal({ eventId, onClose, onImported }) {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const parseCsv = (text) => {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("名前") !== -1 ? headers.indexOf("名前") : headers.indexOf("name") !== -1 ? headers.indexOf("name") : 0;
    const noteIdx = headers.indexOf("備考") !== -1 ? headers.indexOf("備考") : headers.indexOf("note") !== -1 ? headers.indexOf("note") : -1;
    const acastIdx = headers.indexOf("acast_id") !== -1 ? headers.indexOf("acast_id") : -1;
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const name = cols[nameIdx];
      if (!name) continue;
      rows.push({
        name,
        note: noteIdx !== -1 ? cols[noteIdx] || "" : "",
        acast_id: acastIdx !== -1 ? cols[acastIdx] || "" : "",
      });
    }
    return rows;
  };

  const handleImport = async () => {
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      toast.error("有効なデータが見つかりませんでした");
      return;
    }
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await base44.functions.invoke("updateStaffRecord", {
          action: "create",
          data: { event_id: eventId, name: row.name, note: row.note, acast_id: row.acast_id },
        });
        success++;
      } catch (e) {
        failed++;
      }
    }
    setImporting(false);
    toast.success(`${success}名を登録しました${failed > 0 ? `（${failed}名失敗）` : ""}`);
    onImported?.();
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget && !importing) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-4"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-amber-500/10">
              <Bug className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">CSV一括登録（デバッグ）</h3>
              <p className="text-[10px] text-muted-foreground">※デバック用機能です</p>
            </div>
          </div>
          <button onClick={() => !importing && onClose()} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 mb-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">⚠️ デバッグ機能</p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              本機能は開発・テスト用のデバッグ機能です。本番運用時は使用しないでください。
            </p>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-1">
            ヘッダー行付きのCSVを貼り付けてください
          </p>
          <p className="text-[10px] text-muted-foreground mb-2">
            形式: 名前,備考,acast_id
          </p>
          <button
            type="button"
            onClick={() => setCsvText(SAMPLE)}
            className="text-[10px] text-primary hover:underline mb-2"
          >
            サンプルを入力
          </button>
        </div>

        <Textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={SAMPLE}
          className="h-40 text-xs font-mono"
          disabled={importing}
        />

        <div className="flex gap-2 mt-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={importing}>
            キャンセル
          </Button>
          <Button
            className="flex-1 gap-1"
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
          >
            {importing ? (
              <><span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />登録中...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" />登録</>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}