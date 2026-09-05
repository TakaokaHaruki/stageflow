import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Music2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatJaDate } from "@/lib/dateFormat";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import { useUserRole } from "@/hooks/useUserRole";
import { getTodayJST } from "@/components/home/ConcertCard";

export default function Concerts() {
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const { data: concerts = [], isLoading } = useQuery({
    queryKey: ["concerts"],
    queryFn: () => base44.entities.ConcertInfo.list("date", 200),
  });
  const today = getTodayJST();
  // 過去の公演は既定で非表示
  const upcoming = concerts.filter((c) => c.date >= today);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const data = unwrapFunctionResponse(await base44.functions.invoke("scrapeConcertInfo", {}));
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`最新情報を取得しました（新規${data.created}件・更新${data.updated}件）`);
        await queryClient.invalidateQueries({ queryKey: ["concerts"] });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "更新中にエラーが発生しました");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-2 py-3">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Music2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold">大分県のコンサート予定</h2>
              <p className="text-[11px] text-muted-foreground">
                県内の公演予定一覧（過去の公演は非表示）
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={handleUpdate}
              disabled={updating}
            >
              <RefreshCw className={`h-3 w-3 ${updating ? "animate-spin" : ""}`} />
              {updating ? "取得中…" : "最新情報を取得"}
            </Button>
          )}
        </div>
        <div className="space-y-1.5">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" aria-label="読み込み中" />
            ))
          ) : upcoming.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              コンサート情報はまだありません
              {isAdmin && "。「最新情報を取得」でWEBから収集できます"}
            </p>
          ) : (
            upcoming.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2"
              >
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
    </div>
  );
}