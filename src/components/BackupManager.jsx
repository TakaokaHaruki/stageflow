import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, RotateCcw, Plus, Trash2, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import BackupCompareModal from "@/components/BackupCompareModal";

export default function BackupManager() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [pendingCompare, setPendingCompare] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [backingUpEventId, setBackingUpEventId] = useState(null);

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
    onMutate: ({ eventId }) => setBackingUpEventId(eventId),
    onSuccess: (_data, { eventId }) => {
      toast.success("バックアップを作成しました");
      queryClient.invalidateQueries({ queryKey: ["position-backups", eventId] });
      queryClient.invalidateQueries({ queryKey: ["position-backups", selectedEventId] });
      setBackingUpEventId(null);
    },
    onError: (e) => {
      toast.error(e?.message || "バックアップ作成に失敗しました");
      setBackingUpEventId(null);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (backupId) => base44.functions.invoke("restorePositions", { backup_id: backupId }),
    onSuccess: (res) => {
      const data = res?.data || res;
      const restored = data?.restored || {};
      const total = Object.values(restored).reduce((a, b) => a + (b || 0), 0);
      toast.success(`${total}件のデータを復元しました`);
      queryClient.invalidateQueries({ queryKey: ["position-backups", selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ["positions", selectedEventId] });
      setPendingCompare(null);
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
          <h2 className="text-base font-bold">イベントバックアップ・復元</h2>
          <Badge variant="secondary" className="ml-1 gap-1"><Clock className="w-3 h-3" />毎日3時自動実行</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          配置表・スタッフ・緊急連絡先・お知らせ・配布資料など、イベント固有の全データをバックアップ・復元できます。復元時は現在のデータとバックアップ内容を比較してから実行できます。自動バックアップは毎日午前3時に実行され、最新10件（全体で30件）まで保持されます。
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

        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2">イベントごとにバックアップ作成</p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-hide">
            {events.map((ev) => {
              const isBackingUp = backingUpEventId === ev.id;
              return (
                <div key={ev.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
                  <span className="flex-1 text-sm truncate">{ev.name}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{ev.date || "日付未定"}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBackingUp}
                    onClick={() => createBackupMutation.mutate({ eventId: ev.id, label: "手動バックアップ" })}
                    className="gap-1 shrink-0 h-7 px-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isBackingUp ? "作成中..." : "作成"}
                  </Button>
                </div>
              );
            })}
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">対象イベントがありません</p>
            )}
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
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {b.created_at_jst || "日時不明"}{b.created_by_name ? ` ・ ${b.created_by_name}` : ""}
                    </p>
                    {b.summary ? (
                      <p className="text-[11px] text-foreground mt-0.5">{b.summary}</p>
                    ) : b.position_count != null ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5">配置 {b.position_count}件</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoreMutation.isPending}
                    onClick={() => setPendingCompare(b)}
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

      {pendingCompare && (
        <BackupCompareModal
          backup={pendingCompare}
          onClose={() => setPendingCompare(null)}
          onRestore={() => restoreMutation.mutate(pendingCompare.id)}
          isRestoring={restoreMutation.isPending}
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