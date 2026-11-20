import { useDeviceAuth } from "@/hooks/useDeviceAuth";
import { RESTRICTABLE_FEATURES } from "@/lib/deviceFeatures";
import { ShieldX, MonitorSmartphone } from "lucide-react";

/**
 * 制限対象機能の周囲に配置するゲート。
 * 端末が未登録・解除済み・利用範囲不一致の場合、ブロック画面を表示する。
 */
export default function DeviceGate({ featureKey, children }) {
  const { canAccess, isLoading, device, isRegistered } = useDeviceAuth();
  const feature = RESTRICTABLE_FEATURES.find((f) => f.key === featureKey);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        端末認証を確認中...
      </div>
    );
  }

  if (canAccess(featureKey)) {
    return children;
  }

  const reason = !isRegistered
    ? "この端末は貸与端末として登録されていないか、解除されています。"
    : device?.scope === "user" && device?.scope_matches === false
    ? "この端末は別のユーザーに割り当てられています。"
    : "この端末では利用できません。";

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
        <ShieldX className="h-6 w-6 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        {feature?.label || "この機能"}は貸与端末限定です
      </div>
      <p className="text-xs text-muted-foreground max-w-sm">{reason}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <MonitorSmartphone className="w-3.5 h-3.5" />
        管理者から貸与端末の認証URLを取得し、この端末で認証してください。
      </div>
    </div>
  );
}