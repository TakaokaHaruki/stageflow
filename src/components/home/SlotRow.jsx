import { TIME_SLOT_STYLES } from "@/lib/constants";

/**
 * 時間帯別の配置状況行。必要人数に対する充足/不足を色分けで示す。
 */
export default function SlotRow({ slot, assigned, required }) {
  const badge = TIME_SLOT_STYLES[slot]?.badge ?? "bg-muted border-border text-foreground";
  const diff = assigned - required;
  const statusText = required > 0 ? (diff >= 0 ? "充足" : `不足 ${-diff}名`) : assigned > 0 ? "配置のみ" : "ポジションなし";
  const statusClass =
    required === 0
      ? "text-muted-foreground"
      : diff >= 0
        ? "font-semibold text-emerald-600 dark:text-emerald-400"
        : "font-semibold text-rose-600 dark:text-rose-400";

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${badge}`}>{slot}</span>
      <span className="text-[11px] text-muted-foreground">
        配置 <b className="tabular-nums text-foreground">{assigned}</b>／必要 <b className="tabular-nums text-foreground">{required}</b> 名
      </span>
      <span className={`ml-auto shrink-0 text-xs ${statusClass}`}>{statusText}</span>
    </div>
  );
}