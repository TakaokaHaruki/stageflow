import { MapPin, ClipboardList, Users, Wrench, AlertTriangle, StickyNote } from "lucide-react";

/** イベント記録のカテゴリ定義（バッジ色はTailwindのリテラル文字列で保持） */
export const RECORD_CATEGORIES = [
  { name: "会場", icon: MapPin, badgeClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700" },
  { name: "運営", icon: ClipboardList, badgeClass: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700" },
  { name: "スタッフ", icon: Users, badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700" },
  { name: "機材", icon: Wrench, badgeClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700" },
  { name: "トラブル", icon: AlertTriangle, badgeClass: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700" },
  { name: "その他", icon: StickyNote, badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
];

export function getRecordCategory(name) {
  return RECORD_CATEGORIES.find((c) => c.name === name) || RECORD_CATEGORIES[RECORD_CATEGORIES.length - 1];
}