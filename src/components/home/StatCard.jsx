/**
 * ガイドブック準拠の数値カード（KPI）。
 * 数値を強調表記し、充足/不足を色で誤解なく表現する。
 */
export default function StatCard({ icon: Icon, label, value, sub, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "text-rose-600 dark:text-rose-400"
      : tone === "ok"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className={`mt-1.5 truncate text-2xl font-bold leading-tight tabular-nums ${toneClass}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}