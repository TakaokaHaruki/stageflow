import { useEffect, useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import ConfirmDialog from "@/components/ConfirmDialog";
import MeetingSheetEditor from "@/components/MeetingSheetEditor";
import { getJstNow } from "@/lib/accessTracker";

export default function MeetingSheetManager({ eventId, eventName, eventDate, venue, eventChief, eventCloak, canEdit, eventTimes }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadSheets = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.MeetingSheet.filter(
        { event_id: eventId },
        { sort: "-updated_date", limit: 100 }
      );
      setSheets(res.items || []);
    } catch (e) {
      toast.error("ミーティング用紙の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (sheet) => {
    setEditing(sheet);
    setEditorOpen(true);
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.MeetingSheet.update(editing.id, data);
        toast.success("ミーティング用紙を更新しました");
      } else {
        await base44.entities.MeetingSheet.create({
          ...data,
          event_id: eventId,
          created_by_name: data.created_by_name || "",
        });
        toast.success("ミーティング用紙を作成しました");
      }
      setEditorOpen(false);
      setEditing(null);
      await loadSheets();
    } catch (e) {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.MeetingSheet.delete(deleteTarget.id);
      toast.success("ミーティング用紙を削除しました");
      setDeleteTarget(null);
      await loadSheets();
    } catch (e) {
      toast.error("削除に失敗しました");
    }
  };

  return (
    <div>
      <SectionHeader
        icon={FileText}
        title="ミーティング用紙"
        subtitle="公演ごとにミーティング用紙を作成・編集し、PDFで出力できます。"
        actions={canEdit && (
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" />新規作成
          </Button>
        )}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">ミーティング用紙がありません</p>
          {canEdit && (
            <Button onClick={openNew} variant="outline" size="sm" className="mt-4">
              <Plus className="h-4 w-4" />新規作成
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold truncate">{sheet.title || "ミーティング用紙"}</h3>
                  {sheet.event_name && <p className="text-xs text-muted-foreground truncate">{sheet.event_name}</p>}
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {sheet.updated_at_jst ? `更新: ${sheet.updated_at_jst}` : ""}
                    {sheet.created_by_name ? `　作成: ${sheet.created_by_name}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {canEdit && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(sheet)}>
                      <Pencil className="h-3.5 w-3.5" />編集
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(sheet)}>
                      <Trash2 className="h-3.5 w-3.5" />削除
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editorOpen && (
        <MeetingSheetEditor
          sheet={editing}
          eventName={eventName}
          eventDate={eventDate}
          venue={venue}
          eventChief={eventChief}
          eventCloak={eventCloak}
          eventTimes={eventTimes}
          onSave={handleSave}
          onCancel={() => { setEditorOpen(false); setEditing(null); }}
          saving={saving}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`「${deleteTarget.title || "ミーティング用紙"}」を削除しますか？`}
          confirmLabel="削除"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}