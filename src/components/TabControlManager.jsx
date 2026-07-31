import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { LayoutTemplate } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

const TAB_CONFIGS = [
  { id: "staff", label: "スタッフ管理", key: "tab_disabled_staff" },
  { id: "dragdrop", label: "配置表", key: "tab_disabled_dragdrop" },
  { id: "seating_map", label: "客席配置図", key: "tab_disabled_seating_map" },
  { id: "files", label: "配布資料", key: "tab_disabled_files" },
  { id: "settings", label: "管理設定", key: "tab_disabled_settings" },
];

export default function TabControlManager() {
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ["appConfig", "tab_control"],
    queryFn: () => base44.entities.AppConfig.list(),
  });

  const tabConfigs = configs.filter((c) =>
    TAB_CONFIGS.some((t) => t.key === c.key)
  );

  const toggleMutation = useMutation({
    mutationFn: async ({ key, disabled }) => {
      const existing = tabConfigs.find((c) => c.key === key);
      if (existing) {
        await base44.entities.AppConfig.update(existing.id, { value_bool: disabled });
      } else {
        await base44.entities.AppConfig.create({ key, value_bool: disabled });
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["appConfig", "tab_control"] }),
  });

  const isDisabled = (key) =>
    tabConfigs.find((c) => c.key === key)?.value_bool === true;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={LayoutTemplate}
        title="タブ制御"
        subtitle="全イベントのタブ表示を一括管理します（管理者・チーフは常に全タブ表示）"
      />
      <div className="space-y-2.5">
        {TAB_CONFIGS.map(({ id, label, key }) => (
          <div
            key={id}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
          >
            <span className="text-sm font-medium">{label}</span>
            <Switch
              checked={!isDisabled(key)}
              onCheckedChange={(checked) =>
                toggleMutation.mutate({ key, disabled: !checked })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}