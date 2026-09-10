import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Search, Trash2, RefreshCw, Monitor, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";
import AccessStats from "./AccessStats";
import ConfirmDialog from "@/components/ConfirmDialog";

const AUTH_LABELS = { app_user: "アプリ", portal_staff: "ポータル", anonymous: "未ログイン" };
const AUTH_STYLES = {
  app_user: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700",
  portal_staff: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700",
  anonymous: "bg-muted text-muted-foreground border-border",
};
const DEVICE_ICONS = { mobile: Smartphone, tablet: Tablet, desktop: Monitor };

function UserLabel({ log }) {
  if (log.auth_type === "app_user" && log.user_email) {
    return <span className="truncate">{log.user_email}{log.user_role ? ` (${log.user_role})` : ""}</span>;
  }
  if (log.portal_acast_id) {
    return <span className="truncate">A-CAST: {log.portal_acast_id}</span>;
  }
  return <span className="text-muted-foreground">未ログイン</span>;
}

export default function AccessLogPanel() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [authFilter, setAuthFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [cleanupDays, setCleanupDays] = useState("90");
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["access-logs"],
    queryFn: () => base44.entities.AccessLog.list("-created_date", 500),
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return logs.filter((l) => {
      const day = (l.logged_at_jst || "").slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (authFilter !== "all" && l.auth_type !== authFilter) return false;
      if (deviceFilter !== "all" && l.device_type !== deviceFilter) return false;
      if (kw) {
        const hay = `${l.page_path} ${l.from_path} ${l.referrer} ${l.query} ${l.user_email} ${l.portal_acast_id}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, dateFrom, dateTo, authFilter, deviceFilter, keyword]);

  const handleCleanup = async () => {
    const days = parseInt(cleanupDays, 10);
    if (!Number.isFinite(days) || days < 1) {
      toast.error("日数を正しく入力してください");
      setShowCleanupConfirm(false);
      return;
    }
    try {
      const cutoff = new Date(Date.now() - days * 86400000)
        .toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" })
        .replace("T", " ")
        .slice(0, 16);
      await base44.entities.AccessLog.deleteMany({ logged_at_jst: { $lt: cutoff } });
      toast.success(`${days}日前より前のアクセスログを削除しました`);
      queryClient.invalidateQueries({ queryKey: ["access-logs"] });
    } catch {
      toast.error("削除に失敗しました");
    }
    setShowCleanupConfirm(false);
  };

  return (
    <div>
      {/* フィルター */}
      <div className="mb-3 rounded-2xl border border-border bg-card p-3 shadow-md">
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
            <span className="text-[10px] font-medium text-muted-foreground">ログイン状況</span>
            <Select value={authFilter} onValueChange={setAuthFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="app_user">アプリ</SelectItem>
                <SelectItem value="portal_staff">ポータル</SelectItem>
                <SelectItem value="anonymous">未ログイン</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">デバイス</span>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="mobile">モバイル</SelectItem>
                <SelectItem value="tablet">タブレット</SelectItem>
                <SelectItem value="desktop">PC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="col-span-2 space-y-1">
            <span className="text-[10px] font-medium text-muted-foreground">キーワード（パス・経路・ID・メール）</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="検索…" className="h-8 pl-8 text-xs" />
            </div>
          </label>
        </div>
      </div>

      {/* 統計 */}
      <AccessStats logs={filtered} />

      {/* 一覧ヘッダー（件数・更新・古いログ削除） */}
      <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
        <p className="text-xs font-medium text-muted-foreground">{filtered.length} 件</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1">
            <Input
              type="number"
              min="1"
              value={cleanupDays}
              onChange={(e) => setCleanupDays(e.target.value)}
              className="h-6 w-14 border-0 px-1 text-xs focus-visible:ring-0"
            />
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">日前より前を</span>
            <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs text-destructive hover:text-destructive" onClick={() => setShowCleanupConfirm(true)}>
              <Trash2 className="h-3 w-3" />一括削除
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => queryClient.invalidateQueries({ queryKey: ["access-logs"] })}>
            <RefreshCw className="h-3 w-3" />更新
          </Button>
        </div>
      </div>

      {/* 一覧 */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">該当するアクセスログがありません</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.slice(0, 300).map((l) => {
              const DeviceIcon = DEVICE_ICONS[l.device_type] || Monitor;
              return (
                <div key={l.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-xs">
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{l.logged_at_jst}</span>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${AUTH_STYLES[l.auth_type] || AUTH_STYLES.anonymous}`}>
                    {AUTH_LABELS[l.auth_type] || l.auth_type}
                  </span>
                  <span className="flex shrink-0 items-center gap-0.5 text-muted-foreground" title={l.device_type}>
                    <DeviceIcon className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 break-all font-semibold">
                    {l.page_path}
                    {l.query && <span className="font-normal text-muted-foreground">{l.query}</span>}
                  </span>
                  <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                    経路: {l.from_path ? `アプリ内 (${l.from_path})` : (l.referrer ? l.referrer : "直接アクセス")}
                  </span>
                  <span className="ml-auto flex min-w-0 items-center gap-1">
                    <UserLabel log={l} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCleanupConfirm && (
        <ConfirmDialog
          onConfirm={handleCleanup}
          onCancel={() => setShowCleanupConfirm(false)}
          message={`${cleanupDays}日前より前のアクセスログをすべて削除しますか？この操作は元に戻せません。`}
          confirmLabel="削除する"
          confirmVariant="destructive"
        />
      )}
    </div>
  );
}