import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Check } from "lucide-react";
import ModalShell, { ModalHeader, ModalFooter } from "@/components/ModalShell";
import { resolveSections } from "@/lib/meetingSheetSections";

// 全体共通テンプレート一覧から1件選択して用紙へ適用するピッカー
export default function MeetingSheetTemplatePicker({ onApply, onCancel }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.entities.MeetingSheetTemplate.list({ sort: "-updated_date", limit: 100 });
        setTemplates(res.items || []);
      } catch (e) {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-lg">
      <ModalHeader title="テンプレートを適用" onClose={onCancel} />
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">テンプレートがありません。管理設定タブから作成してください。</p>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {templates.map((t) => {
            const count = resolveSections(t).length;
            const active = selected?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">項目 {count} 件{t.updated_at_jst ? `　更新: ${t.updated_at_jst}` : ""}</p>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <ModalFooter>
        <Button variant="outline" className="flex-1" onClick={onCancel}>キャンセル</Button>
        <Button className="flex-1" disabled={!selected} onClick={() => selected && onApply(selected)}>
          <FileText className="h-4 w-4" />適用
        </Button>
      </ModalFooter>
    </ModalShell>
  );
}