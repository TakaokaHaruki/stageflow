import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatJaDate } from "@/lib/dateFormat";

export function getTodayJST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60000).toISOString().split("T")[0];
}

export default function ConcertCard() {
  const navigate = useNavigate();
  const { data: concerts = [], isLoading } = useQuery({
    queryKey: ["concerts"],
    queryFn: () => base44.entities.ConcertInfo.list("date", 200),
  });
  const today = getTodayJST();
  const upcoming = concerts.filter((c) => c.date >= today).slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Music2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">大分県のコンサート</h2>
            <p className="text-[11px] text-muted-foreground">県内の公演予定（WEBから自動収集）</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => navigate("/concerts")}>
          すべて見る
        </Button>
      </div>
      <div className="space-y-1.5">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" aria-label="読み込み中" />
          ))
        ) : upcoming.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">コンサート情報はまだありません</p>
        ) : (
          upcoming.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2">
              <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-1 text-[10px] font-semibold leading-tight text-primary">
                {formatJaDate(c.date)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">{c.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{c.venue || "会場未定"}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}