import { base44 } from "@/api/base44Client";

const PORTAL_ACAST_KEY = "crewly_acast_id";

/** 現在のJST日時を "YYYY-MM-DD HH:mm" 形式で返す */
export function getJstNow() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).replace("T", " ").slice(0, 16);
}

/** ユーザーエージェントからデバイス種別を判定 */
export function getDeviceType() {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * ページアクセスを非同期で記録する（fire-and-forget・失敗は無視）
 */
export function trackPageView({ path, search, fromPath, user }) {
  try {
    const portalAcastId = localStorage.getItem(PORTAL_ACAST_KEY) || "";
    const authType = user ? "app_user" : portalAcastId ? "portal_staff" : "anonymous";
    base44.entities.AccessLog.create({
      page_path: path || "/",
      from_path: fromPath || "",
      referrer: document.referrer || "",
      query: search || "",
      device_type: getDeviceType(),
      user_agent: navigator.userAgent || "",
      auth_type: authType,
      user_email: user?.email || "",
      user_role: user?.role || "",
      portal_acast_id: portalAcastId,
      logged_at_jst: getJstNow(),
    }).catch(() => {});
  } catch {
    // ログ保存失敗は画面に影響させない
  }
}

/**
 * ポータル内の閲覧操作（お知らせ・配布資料など）をViewLogとして非同期記録する
 */
export function trackPortalView({ eventId, viewType, targetTitle, targetId, actorName }) {
  try {
    base44.entities.ViewLog.create({
      event_id: eventId || "",
      view_type: viewType,
      target_title: targetTitle || "",
      target_id: targetId || "",
      actor_name: actorName || "",
      actor_email: "",
      logged_at_jst: getJstNow(),
    }).catch(() => {});
  } catch {
    // ログ保存失敗は画面に影響させない
  }
}