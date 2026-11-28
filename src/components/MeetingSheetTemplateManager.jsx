import { useEffect, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Loader2, FileStack } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import MeetingSheetTemplateEditor from "@/components/MeetingSheetTemplateEditor";
import { resolveSections } from "@/lib/meetingSheetSections";
import { getJstNow } from "@/lib/accessTracker";
import { useUserRole } from "@/hooks/useUserRole";

// 全体共通のミーティング用紙テンプレート管理（管理者用）
export default function MeetingSheetTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { isAdmin } = useUserRole();

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.MeetingSheetTemplate.list({ sort: "-updated_date", limit: 100 });
      setTemplates(res.items || []);
    } catch (e) {
      toast.error("テンプレートの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (t) => { setEditing(t); setEditorOpen(true); };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.MeetingSheetTemplate.update(editing.id, data);
        toast.success("テンプレートを更新しました");
      } else {
        await base44.entities.MeetingSheetTemplate.create(data);
        toast.success("テンプレートを作成しました");
      }
      setEditorOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.MeetingSheetTemplate.delete(deleteTarget.id);
      toast.success("テンプレートを削除しました");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div>
      <SectionHeader
        icon={FileStack}
        title="ミーティング用紙テンプレート"
        subtitle="全体共通の本文テンプレートを管理します。用紙編集から適用できます。"
        actions={isAdmin && (
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" />新規作成
          </Button>
        )}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
          <FileStack className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">テンプレートがありません</p>
          {isAdmin && (
            <Button onClick={openNew} variant="outline" size="sm" className="mt-4">
              <Plus className="h-4 w-4" />新規作成
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold truncate">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">項目 {resolveSections(t).length} 件</p>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {t.updated_at_jst ? `更新: ${t.updated_at_jst}` : ""}
                    {t.created_by_name ? `　作成: ${t.created_by_name}` : ""}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />編集
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                    <Trash2 className="h-3.5 w-3.5" />削除
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editorOpen && isAdmin && (
        <MeetingSheetTemplateEditor
          template={editing}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditing(null); }}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`「${deleteTarget.name}」を削除しますか？`}
          confirmLabel="削除"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}