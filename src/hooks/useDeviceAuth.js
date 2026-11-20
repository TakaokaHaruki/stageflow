import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { getDeviceToken, setDeviceToken, getDeviceInfo } from "@/lib/deviceRequest";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import { CONFIG_KEY } from "@/lib/deviceFeatures";

/**
 * 貸与端末の認証状態を管理するフック。
 * - restrictedFeatures: 端末限定に指定されている機能キー配列
 * - device: 現在の端末情報（トークンから取得）
 * - isRegistered: 有効な端末として登録済み
 * - canAccess(featureKey): 指定機能が現在の端末で利用可能か
 */
export function useDeviceAuth() {
  const [restrictedFeatures, setRestrictedFeatures] = useState([]);
  const [device, setDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 制限対象機能の取得（AppConfig は read: true で全ユーザー参照可能）
      const configs = await base44.entities.AppConfig.filter({ key: CONFIG_KEY }).catch(() => []);
      let features = [];
      if (configs[0]?.value) {
        try { features = JSON.parse(configs[0].value); } catch { features = []; }
      }
      setRestrictedFeatures(features);

      // 現在の端末トークンから端末情報を取得
      const token = getDeviceToken();
      if (token) {
        const rawRes = await base44.functions.invoke("getDeviceStatus", { device_token: token }).catch(() => null);
        const res = unwrapFunctionResponse(rawRes);
        if (res?.device) {
          setDevice(res.device);
        } else {
          setDevice(null);
        }
      } else {
        setDevice(null);
      }
    } catch {
      setDevice(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isRegistered = device?.status === "active";

  const canAccess = useCallback(
    (featureKey) => {
      if (!restrictedFeatures.includes(featureKey)) return true;
      if (!isRegistered) return false;
      // 個人用端末の場合は現在のユーザーと一致している必要がある
      if (device.scope === "user" && device.scope_matches === false) return false;
      return true;
    },
    [restrictedFeatures, isRegistered, device]
  );

  const activate = useCallback(async (token) => {
    const info = getDeviceInfo();
    const rawRes = await base44.functions.invoke("activateDevice", {
      device_token: token,
      device_info: `${info.browser} / ${info.os}`,
    });
    const res = unwrapFunctionResponse(rawRes);
    if (res?.ok && res?.device_token) {
      setDeviceToken(res.device_token);
      await refresh();
    }
    return res;
  }, [refresh]);

  return {
    restrictedFeatures,
    device,
    isRegistered,
    canAccess,
    isLoading,
    refresh,
    activate,
  };
}