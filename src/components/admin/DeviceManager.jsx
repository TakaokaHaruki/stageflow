import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SectionHeader from "@/components/SectionHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Monitor, Smartphone, Ban, Users, User, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RESTRICTABLE_FEATURES, CONFIG_KEY } from "@/lib/deviceFeatures";
import DeviceRegisterForm from "@/components/admin/DeviceRegisterForm";

// プレビュー用のサンプルデータ（Deviceエンティティ未作成時のフォールバック）
const SAMPLE_DEVICES = [
  { id: "s1", label: "事務室PC-A", scope: "shared", target_user_name: "", status: "active", registered_at_jst: "2026-11-15 10:30", last_access_jst: "2026-11-20 09:15", device_info: "Chrome / Windows" },
  { id: "s2", label: "現場ノPC", scope: "user", target_user_name: "山田 太郎", status: "active", registered_at_jst: "2026-11-10 14:00", last_access_jst: "2026-11-19 18:30", device_info: "Safari / macOS" },
  { id: "s3", label: "返却済みタブレット", scope: "shared", target_user_name: "", status: "revoked", registered_at_jst: "2026-11-01 09:00", last_access_jst: "2026-11-05 12:00", device_info: "Safari / iOS" },
];

function scopeBadge(scope) {
  if (scope === "shared")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
        <Users className="w-3 h-3" /> 全社共通
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
      <User className="w-3 h-3" /> 個人用
    </span>
  );
}

function statusBadge(status) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300">
        <CheckCircle2 className="w-3 h-3" /> 有効
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
        <CheckCircle2 className="w-3 h-3" /> 認証待ち
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
      <XCircle className="w-3 h-3" /> 解除済み
    </span>
  );
}

function DeviceRow({ device, onRevoke }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div className="mt-0.5 shrink-0">
        {device.device_info?.includes("iOS") || device.device_info?.includes("Android") ? (
          <Smartphone className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Monitor className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{device.label}</span>
          {scopeBadge(device.scope)}
          {statusBadge(device.status)}
        </div>
        {device.target_user_name && (
          <div className="text-xs text-muted-foreground">対象: {device.target_user_name}</div>
        )}
        {device.device_info && (
          <div className="text-xs text-muted-foreground">{device.device_info}</div>
        )}
        <div className="text-xs text-muted-foreground">
          登録: {device.registered_at_jst || "—"}
          {device.last_access_jst ? ` ／ 最終アクセス: ${device.last_access_jst}` : ""}
        </div>
      </div>
      {device.status !== "revoked" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRevoke(device)}
          className="shrink-0 text-destructive hover:text-destructive"
        >
          <Ban className="w-3.5 h-3.5" /> 解除
        </Button>
      )}
    </div>
  );
}

function FeatureToggle({ feature, restricted, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{feature.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{feature.description}</div>
      </div>
      <Switch checked={restricted} onCheckedChange={onToggle} />
    </div>
  );
}

export default function DeviceManager() {
  const queryClient = useQueryClient();

  // 制限対象機能の取得
  const { data: restrictedFeatures = [] } = useQuery({
    queryKey: ["appConfig", CONFIG_KEY],
    queryFn: async () => {
      try {
        const configs = await base44.entities.AppConfig.filter({ key: CONFIG_KEY });
        if (!configs[0]?.value) return [];
        return JSON.parse(configs[0].value);
      } catch {
        return [];
      }
    },
  });

  // 登録端末一覧の取得
  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      try {
        const list = await base44.entities.Device.filter({}, "-created_date", 200);
        return list;
      } catch {
        // Deviceエンティティ未作成時はサンプルデータを表示
        return SAMPLE_DEVICES;
      }
    },
  });

  // ユーザー一覧（個人用端末の対象選択用）
  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch {
        return [];
      }
    },
  });

  // 機能制限トグル
  const featureMutation = useMutation({
    mutationFn: async ({ key, enable }) => {
      const configs = await base44.entities.AppConfig.filter({ key: CONFIG_KEY });
      let features = [];
      if (configs[0]?.value) {
        try { features = JSON.parse(configs[0].value); } catch { features = []; }
      }
      let next;
      if (enable) {
        next = Array.from(new Set([...features, key]));
      } else {
        next = features.filter((f) => f !== key);
      }
      const value = JSON.stringify(next);
      if (configs[0]) {
        await base44.entities.AppConfig.update(configs[0].id, { value });
      } else {
        await base44.entities.AppConfig.create({ key: CONFIG_KEY, value });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appConfig", CONFIG_KEY] });
    },
  });

  const handleToggleFeature = (featureKey, enable) => {
    featureMutation.mutate(
      { key: featureKey, enable },
      {
        onSuccess: () => toast.success(enable ? "制限を有効にしました" : "制限を解除しました"),
        onError: () => toast.error("更新に失敗しました"),
      }
    );
  };

  // 端末解除
  const revokeMutation = useMutation({
    mutationFn: (device) => base44.functions.invoke("revokeDevice", { device_id: device.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast.success("端末を解除しました");
    },
    onError: () => toast.error("解除に失敗しました"),
  });

  const handleRevoke = (device) => {
    if (confirm(`「${device.label}」を解除しますかか？解除後この端末からは制限対象機能を利用できません。`)) {
      revokeMutation.mutate(device);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={ShieldCheck}
        title="貸与端末管理"
        subtitle="貸与端末を登録・解除し、端末限定にする機能を指定します"
      />

      {/* 機能制限設定 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">端末限定にする機能</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {RESTRICTABLE_FEATURES.map((feature) => (
            <FeatureToggle
              key={feature.key}
              feature={feature}
              restricted={restrictedFeatures.includes(feature.key)}
              onToggle={(checked) => handleToggleFeature(feature.key, checked)}
            />
          ))}
        </div>
        {restrictedFeatures.length === 0 && (
          <p className="text-xs text-muted-foreground">現在端末限定にしている機能はありません。トグルをONにすると、登録済み端末からのみ利用可能になります。</p>
        )}
      </div>

      {/* 新規登録 */}
      <DeviceRegisterForm
        users={users}
        onRegistered={() => queryClient.invalidateQueries({ queryKey: ["devices"] })}
      />

      {/* 端末一覧 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">登録端末一覧</div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            読み込み中...
          </div>
        ) : !devices || devices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            登録された端末はありません
          </div>
        ) : (
          <div className="grid gap-2">
            {devices.map((device) => (
              <DeviceRow key={device.id} device={device} onRevoke={handleRevoke} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}