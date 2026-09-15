import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Eye, ShieldAlert } from "lucide-react";
import { EVENT_LIMIT_CONFIG_KEY, EVENT_LIMIT_COUNT } from "@/hooks/useEventViewLimit";

/**
 * 管理者設定：イベント閲覧制限（チーフ権限以下は最新2件のみ閲覧可能）のON/OFF
 */
export default function EventViewLimitManager() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["appConfig", EVENT_LIMIT_CONFIG_KEY],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ key: EVENT_LIMIT_CONFIG_KEY });
      return configs[0] || null;
    },
  });

  const enabled = config?.value_bool === true;

  const mutation = useMutation({
    mutationFn: async (newValue) => {
      if (config) {
        await base44.entities.AppConfig.update(config.id, { value_bool: newValue });
      } else {
        await base44.entities.AppConfig.create({ key: EVENT_LIMIT_CONFIG_KEY, value_bool: newValue });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appConfig", EVENT_LIMIT_CONFIG_KEY] }),
  });

  return (
    <div className="max-w-xl">
      <div className="mb-3">
        <h2 className="text-base font-bold flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-primary" />
          イベント閲覧制限
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          チーフ権限以下のユーザーが閲覧できる過去のイベントを最新{EVENT_LIMIT_COUNT}件に制限します。今後のイベントは全件閲覧できます（管理者は全件閲覧可）。
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">過去のイベントは最新{EVENT_LIMIT_COUNT}件のみ閲覧可能</span>
          </div>
          {isLoading ? (
            <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          ) : (
            <Switch checked={enabled} onCheckedChange={(v) => mutation.mutate(v)} disabled={mutation.isPending} />
          )}
        </div>
        {enabled && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>管理者以外のユーザーは、過去のイベントは最新{EVENT_LIMIT_COUNT}件まで閲覧できます（今後のイベントは全員閲覧可・管理者は全件閲覧可）</span>
          </div>
        )}
      </div>
    </div>
  );
}