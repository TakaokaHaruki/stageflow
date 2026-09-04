import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, RotateCcw, GitCompare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import EventScopeSelector from "@/components/admin/EventScopeSelector";
import BackupCompareModal from "@/components/BackupCompareModal";
import BackupVersionDiffModal from "@/components/backup/BackupVersionDiffModal";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * バックアップ履歴ページ: イベントごとの全バックアップを一覧表示し、
 * 2バージョンを選んで差分比較できる。復元は現在データとの比較確認後に実行。
 */
export default function BackupHistory() {
  const queryClient = useQueryClient();
  const { canEdit } = useUserRole();
  const [selectedEventId, setSelectedEventId] = useState("");
  const [compareIds, setCompareIds] = useState([]);
  const [diffOpen, setDiffOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState(null);

  const backupsQuery = useQuery({
    queryKey: ["position-backups", selectedEventId],
    queryFn: () => base44.entities.PositionBackup.filter({ event_id: selectedEventId }, "-created_date", 50),
    enabled: !!selectedEventId,
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
      setPendingRestore(null);
    },
    onError: (e) => toast.error(e?.message || "復元に失敗しました"),
  });

  if (!canEdit) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <div>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h1 className="text-base font-bold">閲覧する権限がありません</h1>
        </div>
      </div>
    );
  }

  const backups = backupsQuery.data || [];

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  // 選択中の2件を古い・新しい順に並べる
  const compareBackups = compareIds
    .map((id) => backups.find((b) => b.id === id))
    .filter(Boolean)
    .sort((a, b) => (a.created_date || "").localeCompare(b.created_date || ""));
  const [olderBackup, newerBackup] = compareBackups;

  return (
    <div className="mx-auto max-w-4xl space-y-3 px-2 py-3">
      {/* 概要カード */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-base font-bold">バックアップ履歴</h2>
          <Badge variant="secondary" className="ml-1 gap-1"><Database className="w-3 h-3" />イベントごとに最新20件</Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          イベントごとの全バックアップを確認できます。2つのバージョンを選んで「バージョン比較」で差分を確認したり、復元したいバージョンの「復元」から現在のデータとの比較を経て復元できます。
        </p>
        <div className="mt-3">
          <EventScopeSelector
            value={selectedEventId}
            onChange={(v) => {
              setSelectedEventId(v);
              setCompareIds([]);
              setDiffOpen(false);
            }}
          />
        </div>
      </div>

      {/* 一覧 */}
      {selectedEventId && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold flex-1">バックアップ一覧</h3>
            <Button
              size="sm"
              className="gap-1"
              disabled={compareIds.length !== 2}
              onClick={() => setDiffOpen(true)}
            >
              <GitCompare className="w-3.5 h-3.5" />バージョン比較
            </Button>
          </div>

          {backupsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">読み込み中...</p>
          ) : backups.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">バックアップがありません。</p>
          ) : (
            <div className="space-y-2">
              {backups.map((b) => (
                <div key={b.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 p-2.5">
                  <input
                    type="checkbox"
                    checked={compareIds.includes(b.id)}
                    onChange={() => toggleCompare(b.id)}
                    aria-label={`${b.label || "バックアップ"}を比較対象に選択`}
                    className="h-4 w-4 shrink-0 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">{b.label || "バックアップ"}</span>
                      {b.is_auto && <Badge variant="outline" className="text-[10px] h-4">自動</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {b.created_at_jst || "日時不明"}{b.created_by_name ? ` ・ ${b.created_by_name}` : ""}
                    </p>
                    {b.summary && <p className="text-[11px] text-foreground mt-0.5">{b.summary}</p>}
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {diffOpen && olderBackup && newerBackup && (
        <BackupVersionDiffModal older={olderBackup} newer={newerBackup} onClose={() => setDiffOpen(false)} />
      )}
      {pendingRestore && (
        <BackupCompareModal
          backup={pendingRestore}
          onClose={() => setPendingRestore(null)}
          onRestore={() => restoreMutation.mutate(pendingRestore.id)}
          isRestoring={restoreMutation.isPending}
        />
      )}
    </div>
  );
}