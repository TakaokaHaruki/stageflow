import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import StaffSearchDetail from "@/components/staff/StaffSearchDetail";

export default function StaffSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);

  const runSearch = useCallback(async (q) => {
    setLoading(true);
    setSearched(true);
    setSelected(null);
    try {
      const res = await base44.functions.invoke("searchStaffAcrossEvents", { query: q.trim() });
      setResults(res.data?.results || []);
    } catch {
      toast.error("検索に失敗しました");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    runSearch(query);
  }

  if (selected) {
    return <StaffSearchDetail staff={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4 p-4 pb-10">
      <div>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />スタッフ分析
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          スタッフ名で全イベントを横断検索し、配置傾向・ポジション担当歴を確認できます。
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="スタッフ名を入力（空欄で全件）"
            className="pl-8"
          />
        </div>
        <Button type="submit" disabled={loading}>検索</Button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />検索中…
        </div>
      )}

      {!loading && searched && (
        <div className="text-xs text-muted-foreground">{results.length}件のスタッフ</div>
      )}

      <div className="space-y-2">
        {results.map((s) => (
          <button
            key={s.name}
            onClick={() => setSelected(s)}
            className="w-full text-left rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{s.name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {s.gender && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{s.gender}</span>}
                  {s.roles.slice(0, 2).map(r => (
                    <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{r}</span>
                  ))}
                  {s.chiefCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      チーフ{s.chiefCount}回
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <div className="text-lg font-bold text-primary leading-none tabular-nums">{s.eventCount}</div>
                  <div className="text-[10px] text-muted-foreground">イベント</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            {s.events[0] && (
              <div className="mt-2 text-[11px] text-muted-foreground truncate">
                直近: {s.events[0].event_name} ({s.events[0].date || "日付未定"})
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}