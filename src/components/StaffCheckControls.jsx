import { Lightbulb, Utensils } from "lucide-react";

/**
 * 表示モード用：スタッフ名の横に表示するペンライト貸出・弁当確認のチェック欄。
 * アイコンのみで文字は持たない。チェック状態はアイコンの塗り／枠線で表す。
 */
export default function StaffCheckControls({ staffData, onToggle, canCheck = true, size = "sm" }) {
  if (!staffData) return null;
  const penOn = Boolean(staffData.penlight_checked);
  const benOn = Boolean(staffData.bento_checked);
  const iconSize = size === "lg" ? "w-3.5 h-3.5" : "w-3 h-3";

  const baseBtn =
    "flex items-center justify-center rounded-md border transition-colors shrink-0";
  const dim = size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={canCheck && onToggle ? () => onToggle("penlight_checked", !penOn) : undefined}
        className={`${baseBtn} ${dim} ${
          penOn
            ? "bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400"
            : "bg-transparent border-border text-muted-foreground/60"
        } ${canCheck && onToggle ? "hover:bg-amber-50 dark:hover:bg-amber-900/20" : "cursor-default"}`}
        title="ペンライト貸出確認"
        aria-pressed={penOn}
        aria-label="ペンライト貸出確認"
      >
        <Lightbulb className={iconSize} />
      </button>
      <button
        type="button"
        onClick={canCheck && onToggle ? () => onToggle("bento_checked", !benOn) : undefined}
        className={`${baseBtn} ${dim} ${
          benOn
            ? "bg-green-100 dark:bg-green-900/40 border-green-400 dark:border-green-600 text-green-600 dark:text-green-400"
            : "bg-transparent border-border text-muted-foreground/60"
        } ${canCheck && onToggle ? "hover:bg-green-50 dark:hover:bg-green-900/20" : "cursor-default"}`}
        title="弁当確認"
        aria-pressed={benOn}
        aria-label="弁当確認"
      >
        <Utensils className={iconSize} />
      </button>
    </div>
  );
}