import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { loadEventById } from "@/lib/eventLoader";

export default function AccessRestrictionManager({ eventId }) {
  const queryClient = useQueryClient();
  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => loadEventById(eventId),
  });

  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(Boolean(event?.admin_only));
  }, [event?.id, event?.admin_only]);

  const handleToggle = async (checked) => {
    setEnabled(checked);
    setSaving(true);
    try {
      const res = await base44.functions.invoke("updateEventFeatureFlag", {
        eventId,
        field: "admin_only",
        value: checked,
      });
      const data = res?.data;
      if (data?.error) {
        toast.error(data.error);
        setEnabled(!checked);
      } else {
        queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        queryClient.invalidateQueries({ queryKey: ["events"] });
        toast.success(checked ? "管理者専用モードを有効にしました" : "管理者専用モードを無効にしました");
      }
    } catch (e) {
      toast.error("更新に失敗しました");
      setEnabled(!checked);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-3">
        <h2 className="text-base font-bold flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-primary" />
          アクセス制限
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          このイベントの詳細ページへのアクセスを管理者に限定します。
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">管理者専用モード</span>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
        </div>
        {enabled && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>管理者以外はこのイベントの詳細ページにアクセスできません</span>
          </div>
        )}
      </div>
    </div>
  );
}