import { jstNow } from "./eventBackup.ts";

// 端末認証で制限可能な機能のレジストリ（src/lib/deviceFeatures.js と同期）
export const RESTRICTED_FEATURES = [
  { key: "export_pdf", label: "配置表PDF出力" },
  { key: "backup", label: "バックアップ・復元" },
  { key: "export_logs", label: "アクセスログ出力" },
  { key: "scrape", label: "外部データ取得" },
];

const CONFIG_KEY = "device_restricted_features";

// 管理者が端末限定に指定した機能キーの配列を取得
export async function getRestrictedFeatures(client) {
  try {
    const configs = await client.asServiceRole.entities.AppConfig.filter({ key: CONFIG_KEY });
    if (!configs[0]?.value) return [];
    return JSON.parse(configs[0].value);
  } catch {
    return [];
  }
}

/**
 * 端末認証を検証する。機能が制限対象でない場合は常に許可。
 * @param client - createClientFromRequest(req) の戻り値
 * @param device_token - リクエスト本文から受け取った端末トークン
 * @param feature_key - RESTRICTED_FEATURES の key
 * @returns { allowed: boolean, reason: string, device?: object }
 */
export async function verifyDeviceAccess(client, device_token, feature_key) {
  const restricted = await getRestrictedFeatures(client);
  if (!restricted.includes(feature_key)) {
    return { allowed: true, reason: "not_restricted" };
  }
  if (!device_token) {
    return { allowed: false, reason: "no_token" };
  }
  let devices;
  try {
    devices = await client.asServiceRole.entities.Device.filter({ token: device_token });
  } catch {
    return { allowed: false, reason: "lookup_failed" };
  }
  if (!devices[0]) {
    return { allowed: false, reason: "invalid_token" };
  }
  const d = devices[0];
  if (d.status !== "active") {
    return { allowed: false, reason: "not_active", device: d };
  }
  const user = await client.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
  if (!user) {
    return { allowed: false, reason: "no_user" };
  }
  if (d.scope === "user" && d.target_user_id !== user.id) {
    return { allowed: false, reason: "scope_mismatch", device: d };
  }
  // 最終アクセス日時を更新（非ブロッキング）
  try {
    await client.asServiceRole.entities.Device.update(d.id, { last_access_jst: jstNow() });
  } catch {}
  return { allowed: true, device: d };
}