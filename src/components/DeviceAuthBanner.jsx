import { useEffect, useState } from "react";
import { Smartphone, Globe, User as UserIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useDeviceAuth } from "@/hooks/useDeviceAuth";
import { getUserDisplayName } from "@/lib/userDisplay";

/**
 * 認証済み貸与端末でのみ表示される固定バナー。
 * 端末名・アクセス元IP・ログイン名を常時表示し、
 * 通常画面の最上部に固定で挟み込む。
 */
export default function DeviceAuthBanner() {
  const { device, clientIp, isRegistered, isLoading } = useDeviceAuth();
  const [user, setUser] = useState(null);

  // 端末が認証済みの場合のみログイン名を取得
  useEffect(() => {
    if (!isRegistered) {
      setUser(null);
      return;
    }
    let active = true;
    base44.auth.me()
      .then((u) => { if (active) setUser(u); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, [isRegistered]);

  // 認証端末でない・または確認中は何も表示しない
  if (isLoading || !isRegistered || !device) return null;

  const loginName = getUserDisplayName(user) || "（未ログイン）";

  return (
    <div className="sticky top-0 z-[60] bg-slate-800 dark:bg-slate-900 text-white safe-area-top">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-2 py-1 text-[11px] leading-none sm:gap-3 sm:px-4 sm:py-1.5 sm:text-xs">
        <span className="flex min-w-0 items-center gap-1">
          <Smartphone className="h-3 w-3 shrink-0 text-sky-300" />
          <span className="max-w-[40%] truncate font-semibold sm:max-w-none">{device.label || "端末"}</span>
        </span>
        <span className="h-3 w-px shrink-0 bg-slate-500/50" />
        <span className="flex min-w-0 items-center gap-1">
          <Globe className="h-3 w-3 shrink-0 text-emerald-300" />
          <span className="truncate font-mono">{clientIp || "---.---.---.---"}</span>
        </span>
        <span className="h-3 w-px shrink-0 bg-slate-500/50" />
        <span className="flex min-w-0 items-center gap-1">
          <UserIcon className="h-3 w-3 shrink-0 text-amber-300" />
          <span className="truncate">{loginName}</span>
        </span>
      </div>
    </div>
  );
}