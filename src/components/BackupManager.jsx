import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, RotateCcw, Plus, Trash2, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function BackupManager() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [pendingRestore, setPendingRestore] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const eventsQuery = useQuery({
    queryKey: ["events-for-backup"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  const backupsQuery = useQuery({
    queryKey: ["position-backups", selectedEventId],
    queryFn: () => base44.entities.PositionBackup.filter({ event_id: selectedEventId }, "-created_date", 50),
    enabled: !!selectedEventId,
  });

  const createBackupMutation = useMutation({
    mutationFn: ({ eventId, label }) =>
      base44.functions.invoke("backupPositions", { event_id: eventId, label, is_auto: false }),
    onSuccess: () => {
      toast.success("バックアップを作成しました");
      queryClient.invalidateQueries({ queryKey: ["position-backups", selectedEventId] });
    },
    onError: (e) => toast.error(e?.message || "バックアップ作成に失敗しました"),
  });

  const restoreMutation = useMutation({
    mutationFn: (backupId) => base44.functions.invoke("restorePositions", { backup_id: backupId }),
    onSuccess: (res) => {
      const data = res?.data || res;
      toast.success(`${data?.restored ?? 0}件のポジションを復元しました`);
      queryClient.invalidateQueries({ queryKey: ["position-backups", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["positions", selectedEventId] });
      setPendingRestore(null);
    },
    onError: (e) => toast.error(e?.message || "復元に失敗しました"),
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (id) => base44.entities.PositionBackup.delete(id),
    onSuccess: () => {
      toast.success("バックアップを削除しました");
      queryClient.invalidateQueries({ queryKey: ["position-backups", selectedEventId] });
      setPendingDelete(null);
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const events = eventsQuery.data || [];
  const backups = backupsQuery.data || [];
  const now = new Date();
  const activeEvents = events.filter((e) => {
    if (!e.date) return true;
    const d = new Date(e.date + "T23:59");
    return d >= new Date(now.getTime() - 7 * 86400000);
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">配置バックアップ・復元</h2>
          <Badge variant="secondary" className="ml-1 gap-1"><Clock className="w-3 h-3" />毎日3時自動実行</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          配置表（ポジション）のスナップショットを保存し、データ消失時に復元できます。各イベントごとに手動バックアップの作成・一覧確認・復元が可能です。自動バックアップは毎日午前3時に実行され、最新10件（全体で30件）まで保持されます。
        </p>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">対象イベント</label>
          <div className="flex gap-2">
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">イベントを選択...</option>
              {activeEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.date || "日付未定"})</option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={!selectedEventId || createBackupMutation.isPending}
              onClick={() => createBackupMutation.mutate({ eventId: selectedEventId, label: "手動バックアップ" })}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />バックアップ作成
            </Button>
          </div>
        </div>
      </div>

      {selectedEventId && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold">バックアップ一覧</h3>
            {backupsQuery.isLoading && <span className="text-xs text-muted-foreground">読み込み中...</span>}
          </div>

          {backups.length === 0 && !backupsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">バックアップがありません。「バックアップ作成」で保存できます。</p>
          ) : (
            <div className="space-y-2">
              {backups.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{b.label || "バックアップ"}</span>
                      {b.is_auto && <Badge variant="outline" className="text-[10px] h-4">自動</Badge>}
                      <Badge variant="secondary" className="text-[10px] h-4">{b.position_count}件</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {b.created_at_jst || "日時不明"}{b.created_by_name ? ` ・ ${b.created_by_name}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoreMutation.isPending}
                    onClick={() => setPendingRestore(b)}
                    className="gap-1 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />復元
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPendingDelete(b)}
                    className="shrink-0 text-muted-foreground hover:text-destructive px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pendingRestore && (
        <ConfirmDialog
          message={`「${pendingRestore.label || "バックアップ"}」(${pendingRestore.created_at_jst || ""}) から配置を復元します。\n現在の配置は全て上書きされます。この操作は取り消せません。`}
          confirmLabel="復元する"
          confirmVariant="default"
          onCancel={() => setPendingRestore(null)}
          onConfirm={() => restoreMutation.mutate(pendingRestore.id)}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          message={`「${pendingDelete.label || "バックアップ"}」を削除しますか？`}
          confirmLabel="削除"
          confirmVariant="destructive"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteBackupMutation.mutate(pendingDelete.id)}
        />
      )}
    </div>
  );
}