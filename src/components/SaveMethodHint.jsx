import { RefreshCw, Save } from "lucide-react";

/**
 * フォームの保存方式をモーダル内で明示する案内バッジ。
 * - mode="realtime": リアルルタイム保存（完了トーストなし）
 * - mode="explicit": 保存ボタン押下が必要（完了トーストあり）
 */
export default function SaveMethodHint({ mode = "explicit", className = "" }) {
  const isRealtime = mode === "realtime";
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
        isRealtime
          ? "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
          : "bg-sky-50 border border-sky-200 text-sky-700 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300"
      } ${className}`}
    >
      {isRealtime ? <RefreshCw className="w-3 h-3 shrink-0" /> : <Save className="w-3 h-3 shrink-0" />}
      <span>{isRealtime ? "リアルタイムで保存されます" : "編集完了後に保存ボタンを押してください"}</span>
    </div>
  );
}