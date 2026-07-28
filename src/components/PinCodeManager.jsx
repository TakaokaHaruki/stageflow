import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff, KeyRound, AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import SectionHeader from "@/components/SectionHeader";

const AUTH_CONFIG_KEY = "chief_pin_auth_enabled";

async function fetchAuthConfig() {
  const configs = await base44.entities.AppConfig.filter({ key: AUTH_CONFIG_KEY });
  return configs[0] || null;
}

export default function PinCodeManager() {
  const queryClient = useQueryClient();
  const [staffList, setStaffList] = useState([]);
  const [pinCodes, setPinCodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(null);

  const { data: authConfig, isLoading: authLoading } = useQuery({
    queryKey: ["appConfig", AUTH_CONFIG_KEY],
    queryFn: fetchAuthConfig,
  });

  const pinAuthEnabled = authConfig ? authConfig.value_bool !== false : true;

  const authMutation = useMutation({
    mutationFn: async (newValue) => {
      if (authConfig) {
        await base44.entities.AppConfig.update(authConfig.id, { value_bool: newValue });
      } else {
        await base44.entities.AppConfig.create({ key: AUTH_CONFIG_KEY, value_bool: newValue });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appConfig", AUTH_CONFIG_KEY] });
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, allPins] = await Promise.all([
        base44.entities.Staff.list(),
        base44.entities.PinCode.list(),
      ]);
      // Only show section chiefs, dedupe by acast_id
      const seen = new Set();
      const chiefs = (staff || [])
        .filter((s) => (s.roles || []).includes("セクションチーフ") && s.acast_id)
        .filter((s) => {
          if (seen.has(s.acast_id)) return false;
          seen.add(s.acast_id);
          return true;
        });
      setStaffList(chiefs);
      const pinMap = {};
      for (const pin of allPins || []) {
        pinMap[pin.acast_id] = pin;
      }
      setPinCodes(pinMap);
    } catch (e) {
      toast.error("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReset = async (staff) => {
    setResetting(staff.id);
    try {
      const pin = pinCodes[staff.acast_id];
      if (pin) {
        await base44.entities.PinCode.update(pin.id, {
          pin_hash: "",
          reset_requested: false,
          reset_requested_at_jst: "",
        });
      }
      toast.success(`「${staff.name}」さんのPINをリセットしました`);
      await loadData();
    } catch (e) {
      toast.error("リセットに失敗しました");
    } finally {
      setResetting(null);
    }
  };

  const pendingCount = Object.values(pinCodes).filter((p) => p.reset_requested).length;

  const getBadge = (pin) => {
    if (!pin || !pin.pin_hash) {
      if (pin?.reset_requested) {
        return { label: "リセット申請中", className: "bg-rose-100 text-rose-700 border-rose-300", icon: AlertTriangle };
      }
      return { label: "未設定", className: "bg-gray-100 text-gray-600 border-gray-300", icon: KeyRound };
    }
    if (pin.reset_requested) {
      return { label: "リセット申請中", className: "bg-rose-100 text-rose-700 border-rose-300", icon: AlertTriangle };
    }
    return { label: "設定済", className: "bg-green-100 text-green-700 border-green-300", icon: ShieldCheck };
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (staffList.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        セクションチーフが登録されていません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={KeyRound}
        title="セクションチーフ PIN管理"
        subtitle={pendingCount > 0 ? (
          <span className="text-rose-600 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            リセット申請中: {pendingCount}件
          </span>
        ) : undefined}
        actions={
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5" />更新
          </Button>
        }
      />

      {/* PIN認証機能の有効/無効切り替え */}
      <div className="mb-4 bg-card border border-border rounded-xl p-4 max-w-md">
        {authLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            複讀み込み中...
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              {pinAuthEnabled ? (
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <ShieldOff className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <div className="text-sm font-semibold">PIN認証機能</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {pinAuthEnabled ? "セクションチーフはログイン時にPIN入力が必須です" : "PIN認証は停止中です — チーフは直接ログインできます"}
                </div>
              </div>
            </div>
            <button
              onClick={() => authMutation.mutate(!pinAuthEnabled)}
              disabled={authMutation.isPending}
              className={`relative shrink-0 inline-flex h-7 w-12 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                pinAuthEnabled ? "bg-primary" : "bg-input"
              }`}
              role="switch"
              aria-checked={pinAuthEnabled}
            >
              <span
                className={`pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  pinAuthEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {!pinAuthEnabled && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 px-3 py-2 max-w-md">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">PIN認証が無効です — セクションチーフはPINなしでログインできます</span>
        </div>
      )}

      <div className="space-y-2">
        {staffList.map((staff, idx) => {
          const pin = pinCodes[staff.acast_id];
          const badge = getBadge(pin);
          const Icon = badge.icon;
          return (
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`flex items-center gap-3 bg-card border rounded-xl p-3 ${pin?.reset_requested ? "border-rose-300" : "border-border"}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{staff.name}</p>
                {staff.acast_id && (
                  <p className="text-[10px] text-muted-foreground truncate">ID: {staff.acast_id}</p>
                )}
              </div>
              <Badge variant="outline" className={`gap-1 shrink-0 ${badge.className}`}>
                <Icon className="w-3 h-3" />
                {badge.label}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0"
                onClick={() => handleReset(staff)}
                disabled={resetting === staff.id || (!pin?.pin_hash && !pin?.reset_requested)}
              >
                {resetting === staff.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                リセット
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}