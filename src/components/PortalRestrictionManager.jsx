import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SectionHeader from "@/components/SectionHeader";
import { ShieldOff, ShieldCheck, AlertTriangle } from "lucide-react";

const CONFIG_KEY = "portal_login_disabled";

async function fetchConfig() {
  const configs = await base44.entities.AppConfig.filter({ key: CONFIG_KEY });
  return configs[0] || null;
}

export default function PortalRestrictionManager() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["appConfig", CONFIG_KEY],
    queryFn: fetchConfig,
  });

  const disabled = config?.value_bool === true;

  const mutation = useMutation({
    mutationFn: async (newValue) => {
      if (config) {
        await base44.entities.AppConfig.update(config.id, { value_bool: newValue });
      } else {
        await base44.entities.AppConfig.create({ key: CONFIG_KEY, value_bool: newValue });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appConfig", CONFIG_KEY] });
    },
  });

  const handleToggle = () => {
    mutation.mutate(!disabled);
  };

  return (
    <div>
      <SectionHeader icon={ShieldOff} title="ポータルログイン制限" />
      <div className="mt-3 bg-card border border-border rounded-xl p-4 max-w-md">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            読み込み中...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                {disabled ? (
                  <ShieldOff className="w-5 h-5 text-destructive shrink-0" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                )}
                <div>
                  <div className="text-sm font-semibold">スタッフポータル アクセス制限</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ONにするとスタッフポータルへのアクセスを全員遮断します
                  </div>
                </div>
              </div>
              <button
                onClick={handleToggle}
                disabled={mutation.isPending}
                className={`relative shrink-0 inline-flex h-7 w-12 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  disabled ? "bg-destructive" : "bg-input"
                }`}
                role="switch"
                aria-checked={disabled}
              >
                <span
                  className={`pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    disabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {disabled && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-xs font-semibold text-destructive">制限中 — スタッフポータルは現在利用不可です</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}