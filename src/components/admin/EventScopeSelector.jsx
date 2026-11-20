import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ResponsiveSelect } from "@/components/ui/responsive-select";

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
      <ResponsiveSelect
        value={value}
        onValueChange={onChange}
        placeholder="イベントを選択..."
        label="対象イベント"
        options={events.map((ev) => ({
          value: ev.id,
          label: `${ev.name} (${ev.date || "日付未定"})`,
        }))}
        className="max-w-sm"
      />
    </div>
  );
}