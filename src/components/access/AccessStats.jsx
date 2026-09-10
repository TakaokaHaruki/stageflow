const AUTH_LABELS = {
  app_user: "アプリ",
  portal_staff: "ポータル",
  anonymous: "未ログイン",
};
const DEVICE_LABELS = { mobile: "モバイル", tablet: "タブレット", desktop: "PC" };

/**
 * アクセス統計カード（絞り込み後のログ集合を集計）
 */
export default function AccessStats({ logs }) {
  const byAuth = {};
  const byDevice = {};
  const byPath = {};
  for (const l of logs) {
    byAuth[l.auth_type] = (byAuth[l.auth_type] || 0) + 1;
    byDevice[l.device_type] = (byDevice[l.device_type] || 0) + 1;
    byPath[l.page_path] = (byPath[l.page_path] || 0) + 1;
  }
  const topPages = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
        <p className="text-[10px] font-medium text-muted-foreground">総アクセス数（絞り込み後）</p>
        <p className="mt-1 text-2xl font-bold leading-none">{logs.length}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
        <p className="text-[10px] font-medium text-muted-foreground">ログイン別</p>
        <div className="mt-1 space-y-0.5">
          {Object.entries(byAuth).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <p key={k} className="flex justify-between text-xs">
              <span>{AUTH_LABELS[k] || k}</span>
              <span className="font-bold">{v}</span>
            </p>
          ))}
          {Object.keys(byAuth).length === 0 && <p className="text-xs text-muted-foreground">-</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
        <p className="text-[10px] font-medium text-muted-foreground">デバイス別</p>
        <div className="mt-1 space-y-0.5">
          {Object.entries(byDevice).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <p key={k} className="flex justify-between text-xs">
              <span>{DEVICE_LABELS[k] || k}</span>
              <span className="font-bold">{v}</span>
            </p>
          ))}
          {Object.keys(byDevice).length === 0 && <p className="text-xs text-muted-foreground">-</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
        <p className="text-[10px] font-medium text-muted-foreground">人気ページ TOP3</p>
        <div className="mt-1 space-y-0.5">
          {topPages.map(([p, c]) => (
            <p key={p} className="flex justify-between gap-1 text-xs">
              <span className="truncate">{p}</span>
              <span className="shrink-0 font-bold">{c}</span>
            </p>
          ))}
          {topPages.length === 0 && <p className="text-xs text-muted-foreground">-</p>}
        </div>
      </div>
    </div>
  );
}