import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full max-w-sm text-sm">
          <SelectValue placeholder="イベントを選択..." />
        </SelectTrigger>
        <SelectContent>
          {events.map((ev) => (
            <SelectItem key={ev.id} value={ev.id}>
              {ev.name} ({ev.date || "日付未定"})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}