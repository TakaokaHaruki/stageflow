import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DatabaseBackup } from "lucide-react";
import { formatJaDate } from "@/lib/dateFormat";

export default function BackupStatusCard() {
  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["home-auto-backups"],
    queryFn: () => base44.entities.PositionBackup.filter({ is_auto: true }, "-created_date", 100),
  });

  const latest = backups[0] || null;
  const runKey = (latest?.created_at_jst || "").slice(0, 16); // YYYY-MM-DD HH:mm
  const runCount = latest ? backups.filter((b) => (b.created_at_jst || "").slice(0, 16) === runKey).length : 0;

  const formatTime = (jst) => {
    if (!jst) return "日時不明";
    return `${formatJaDate(jst.slice(0, 10))} ${jst.slice(11, 16)}`;
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DatabaseBackup className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">自動バックアップ</h2>
          {isLoading ? (
            <p className="text-[11px] text-muted-foreground">取得中…</p>
          ) : latest ? (
            <p className="truncate text-[11px] text-muted-foreground">
              前回: {formatTime(latest.created_at_jst)}（対象{runCount}イベント）
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">実行履歴はまだありません</p>
          )}
        </div>
      </div>
      {latest?.summary && (
        <p className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground">
          保存内容（最新）: {latest.summary}
        </p>
      )}
    </div>
  );
}