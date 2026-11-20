import { useEffect, useRef, useState } from "react";
import { Smartphone, Globe, User as UserIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useDeviceAuth } from "@/hooks/useDeviceAuth";
import { getUserDisplayName } from "@/lib/userDisplay";

/**
 * 認証済み貸与端末でのみ表示される固定バナー。
 * 画面最上部に fixed で常時表示しつつ、自身の高さを
 * --device-banner-height として document に反映する。
 * 同サイズのスペーサーで本文を押し下げ、AppNav の
 * sticky ヘッダーは変数を top に使うことで重なりを防ぐ。
 */
export default function DeviceAuthBanner() {
  const { device, clientIp, isRegistered, isLoading } = useDeviceAuth();
  const [user, setUser] = useState(null);
  const bannerRef = useRef(null);

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

  // バナーの実高さを計測し CSS 変数として共有
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) {
      document.documentElement.style.setProperty("--device-banner-height", "0px");
      return;
    }
    const update = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty("--device-banner-height", `${h}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--device-banner-height", "0px");
    };
  }, [isRegistered, device]);

  // 認証端末でない・または確認中は何も表示しない
  if (isLoading || !isRegistered || !device) return null;

  const loginName = getUserDisplayName(user) || "（未ログイン）";

  return (
    <>
      {/* 固定バナー本体 */}
      <div ref={bannerRef} className="fixed top-0 left-0 right-0 z-[60] bg-slate-800 dark:bg-slate-900 text-white safe-area-top">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-2 py-1 text-[11px] leading-none sm:gap-3 sm:px-4 sm:py-1.5 sm:text-xs">
          <span className="flex min-w-0 items-center gap-1">
            <Smartphone className="h-3 w-3 shrink-0 text-sky-300" />
            <span className="shrink-0 text-slate-400">端末名</span>
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
      {/* fixed分と同じ高さのスペーサーで本文を押し下げ */}
      <div style={{ height: "var(--device-banner-height, 0px)" }} aria-hidden="true" />
    </>
  );
}