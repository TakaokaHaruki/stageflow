import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Users, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import StaffSearchDetail from "@/components/staff/StaffSearchDetail";

const MATCH_LABEL = { exact: "一致", partial: "部分", fuzzy: "類似" };
const MATCH_CLASS = {
  exact: "bg-primary/10 text-primary",
  partial: "bg-muted text-muted-foreground",
  fuzzy: "bg-accent text-accent-foreground",
};

export default function StaffSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const debounceRef = useRef(null);

  // 入力時に候補取得（あいまい検索サジェスト）
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("suggestStaffNames", { query: q });
        setSuggestions(res.data?.candidates || []);
        setShowSuggest(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const runSearch = async (q) => {
    setLoading(true);
    setSearched(true);
    setSelected(null);
    setShowSuggest(false);
    try {
      const res = await base44.functions.invoke("searchStaffAcrossEvents", { query: q.trim() });
      setResults(res.data?.results || []);
    } catch {
      toast.error("検索に失敗しました");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  function onSubmit(e) {
    e.preventDefault();
    runSearch(query);
  }

  function pickSuggestion(name) {
    setQuery(name);
    runSearch(name);
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
          スタッフ名で全イベントを横断検索し、配置傾向・ポジション担当歴を確認できます。ひらがな・カタカナ・部分一致・類似名にも対応します。
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
              placeholder="スタッフ名を入力"
              className="pl-8"
            />
          </div>
          <Button type="submit" disabled={loading}>検索</Button>
        </div>
        {showSuggest && suggestions.length > 0 && (
          <div className="absolute z-30 mt-1 w-full max-w-[calc(100%-5rem)] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(s.name);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              >
                <span className="truncate">{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${MATCH_CLASS[s.matchType] || "bg-muted"}`}>
                  {MATCH_LABEL[s.matchType] || s.matchType}
                </span>
              </button>
            ))}
          </div>
        )}
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
                  {s.roles.slice(0, 2).map((r) => (
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