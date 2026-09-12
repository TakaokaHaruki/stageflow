import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, Bell, FileText, LayoutList, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadLogCsv } from "@/lib/csvExport";
import { fetchAllRecords } from "@/lib/fetchAllRecords";

const VIEW_TYPE_META = {
  announcement_open: { label: "お知らせ", icon: Bell, style: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  file_open: { label: "配布資料", icon: FileText, style: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700" },
  tab_open: { label: "タブ", icon: LayoutList, style: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700" },
  item_expand: { label: "項目展開", icon: ChevronDown, style: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 dark:border-fuchsia-700" },
};

/**
 * ポータル内の閲覧操作（ViewLog）の一覧パネル
 */
export default function ViewLogPanel() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["view-logs"],
    queryFn: () => fetchAllRecords("ViewLog"),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["events-for-view-logs"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  const eventName = (id) => events.find((e) => e.id === id)?.name || "";

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return logs.filter((l) => {
      const day = (l.logged_at_jst || "").slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (typeFilter !== "all" && l.view_type !== typeFilter) return false;
      if (kw) {
        const hay = `${l.actor_name} ${l.target_title} ${l.target_id} ${l.event_id}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, dateFrom, dateTo, typeFilter, keyword]);

  const handleDownloadCsv = async () => {
    setCsvLoading(true);
    try {
      const count = await downloadLogCsv({ target: "view", dateFrom, dateTo });
      toast.success(`${count}件をCSV出力しました`);
    } catch {
      toast.error("CSV出力に失敗しました");
    }
    setCsvLoading(false);
  };

  return (
    <div>
      {/* フィルター */}
      <div className="mb-3 rounded-2xl border border-border bg-card p-3 shadow-md">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">開始日</span>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">終了日</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
          </label>
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">閲覧種別</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="announcement_open">お知らせ</SelectItem>
                <SelectItem value="file_open">配布資料</SelectItem>
                <SelectItem value="tab_open">タブ</SelectItem>
                <SelectItem value="item_expand">項目展開</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">キーワード（スタッフ名・対象名）</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="検索…" className="h-8 pl-8 text-xs" />
            </div>
          </label>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
        <p className="text-xs font-medium text-muted-foreground">{filtered.length} 件</p>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto gap-1.5 text-xs"
          onClick={handleDownloadCsv}
          disabled={csvLoading}
        >
          <Download className="h-3 w-3" />CSVダウンロード
        </Button>
      </div>

      {/* 一覧 */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">該当する閲覧ログがありません</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.slice(0, 300).map((l) => {
              const meta = VIEW_TYPE_META[l.view_type] || VIEW_TYPE_META.item_expand;
              const Icon = meta.icon;
              return (
                <div key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-xs">
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{l.logged_at_jst}</span>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.style}`}>
                    <Icon className="h-2.5 w-2.5" />
                    {meta.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{l.target_title}</span>
                  {eventName(l.event_id) && (
                    <span className="max-w-[180px] shrink-0 truncate text-[11px] text-muted-foreground">{eventName(l.event_id)}</span>
                  )}
                  <span className="ml-auto shrink-0 truncate">{l.actor_name || "不明"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}