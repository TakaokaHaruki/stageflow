import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, RefreshCw, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { downloadLogCsv } from "@/lib/csvExport";

const ACTION_META = {
  click: { label: "クリック", className: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700" },
  change: { label: "選択変更", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
};

/**
 * 操作ログパネル（ボタン・リンクなどのインタラクション履歴）
 */
export default function InteractionLogPanel() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["interaction-logs"],
    queryFn: async () => {
      const res = await base44.entities.InteractionLog.list("-created_date", 500);
      return res || [];
    },
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return logs.filter((l) => {
      if (dateFrom && (l.logged_at_jst || "") < `${dateFrom} 00:00`) return false;
      if (dateTo && (l.logged_at_jst || "") > `${dateTo} 23:59`) return false;
      if (actionFilter !== "all" && l.action_type !== actionFilter) return false;
      if (kw) {
        const hay = `${l.element_label} ${l.element_value} ${l.element_type} ${l.page_path} ${l.user_email} ${l.portal_acast_id} ${l.session_id}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, dateFrom, dateTo, actionFilter, keyword]);

  const handleDownloadCsv = async () => {
    setCsvLoading(true);
    try {
      const count = await downloadLogCsv({ target: "interaction", dateFrom, dateTo });
      toast.success(`${count}件をCSV出力しました`);
    } catch {
      toast.error("CSV出力に失敗しました");
    }
    setCsvLoading(false);
  };

  return (
    <div>
      {/* フィルター */}
      <div className="mb-3 rounded-2xl border border-border bg-card p-2.5 shadow-md">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">開始日</span>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs" />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">終了日</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs" />
          </label>
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">操作種別</span>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="click">クリック</SelectItem>
                <SelectItem value="change">選択変更</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">キーワード（対象・パス・セッション）</span>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="検索..." className="h-8 pl-7 text-xs" />
            </div>
          </label>
        </div>
      </div>

      {/* ヘッダー */}
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
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["interaction-logs"] })}
        >
          <RefreshCw className="h-3 w-3" />更新
        </Button>
      </div>

      {/* 一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-md">
          <p className="text-sm font-medium text-muted-foreground">対象期間に操作ログはありません</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-md">
          {filtered.map((l) => {
            const meta = ACTION_META[l.action_type] || ACTION_META.click;
            return (
              <div key={l.id} className="flex items-start gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="shrink-0 text-[11px] text-muted-foreground">{l.logged_at_jst}</span>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                      {meta.label}
                    </span>
                    <span className="truncate text-xs font-semibold">{l.element_label}</span>
                    {l.element_value && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">→ {l.element_value}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    <span>{l.element_type || "-"}</span>
                    <span>・</span>
                    <span>{l.page_path}</span>
                    {l.ip_address && (
                      <>
                        <span>・</span>
                        <span className="font-mono">{l.ip_address}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {l.user_email || l.portal_acast_id || "未ログイン"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}