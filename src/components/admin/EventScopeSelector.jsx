import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * イベント単位の管理者機能（操作ログ・アクセス制限・スタッフQR）のための
 * 対象イベントセレクター。
 */
export default function EventScopeSelector({ value, onChange }) {
  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  return (
    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <label className="shrink-0 text-xs font-semibold text-muted-foreground">対象イベント</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-2 text-sm"
      >
        <option value="">イベントを選択...</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} ({ev.date || "日付未定"})
          </option>
        ))}
      </select>
    </div>
  );
}