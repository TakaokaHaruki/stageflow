import { Lock } from "lucide-react";

export default function EventLockBanner() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span>このイベントは終了から1日以上経過しているため編集できません（管理者のみ編集可能）</span>
    </div>
  );
}