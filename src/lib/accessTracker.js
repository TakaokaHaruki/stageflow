import { base44 } from "@/api/base44Client";

const PORTAL_ACAST_KEY = "crewly_acast_id";
const VISITOR_KEY = "crewly_visitor_id";
const SESSION_KEY = "crewly_session_id";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// 現在開いているページの記録状態（滞在時間計算用）
const STATE = { lastLogId: null, pageEnteredAt: Date.now() };

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

function randomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

/** 端末単位の永続訪問者ID（localStorageで維持） */
function getVisitorId() {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = randomId();
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

/** 訪問単位のセッションID（30分無操作で新規発行） */
function getSessionId() {
  try {
    const now = Date.now();
    let s = null;
    try {
      s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      s = null;
    }
    if (!s || !s.id || now - s.lastActive > SESSION_TIMEOUT_MS) {
      s = { id: randomId(), lastActive: now };
    }
    s.lastActive = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s.id;
  } catch {
    return "";
  }
}

function detectBrowser() {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Line\//.test(ua)) return "LINE";
  if (/SamsungBrowser\//.test(ua)) return "Samsung Internet";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "その他";
}

function detectOs() {
  const ua = navigator.userAgent || "";
  if (/iPhone/.test(ua)) return "iOS (iPhone)";
  if (/iPad/.test(ua)) return "iOS (iPad)";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "その他";
}

function getScreenSize() {
  try {
    return `${window.screen.width}x${window.screen.height}`;
  } catch {
    return "";
  }
}

/** 流入元の分類（アプリ内/直接/検索/SNS/外部リンク） */
function classifyReferrer(fromPath, referrer) {
  if (fromPath) return "internal";
  if (!referrer) return "direct";
  const r = referrer.toLowerCase();
  if (/google\.|bing\.com|yahoo\.|duckduckgo\./.test(r)) return "search";
  if (/twitter\.com|x\.com|t\.co|facebook\.com|instagram\.com|line\.me|line\.naver/.test(r)) return "sns";
  return "external";
}

/**
 * ページアクセスを非同期で記録する（fire-and-forget・失敗は無視）。
 * 直前ページの滞在時間もあわせて確定させる。
 */
export function trackPageView({ path, search, fromPath, user }) {
  try {
    const now = Date.now();
    const staySeconds = (now - STATE.pageEnteredAt) / 1000;
    const portalAcastId = localStorage.getItem(PORTAL_ACAST_KEY) || "";
    const authType = user ? "app_user" : portalAcastId ? "portal_staff" : "anonymous";
    const payload = {
      page_path: path || "/",
      from_path: fromPath || "",
      referrer: document.referrer || "",
      referrer_type: classifyReferrer(fromPath, document.referrer),
      query: search || "",
      device_type: getDeviceType(),
      browser: detectBrowser(),
      os: detectOs(),
      screen_size: getScreenSize(),
      user_agent: navigator.userAgent || "",
      auth_type: authType,
      user_email: user?.email || "",
      user_role: user?.role || "",
      portal_acast_id: portalAcastId,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
    };
    if (STATE.lastLogId && staySeconds >= 0) {
      payload.update_log_id = STATE.lastLogId;
      payload.stay_seconds = staySeconds;
    }
    // バックエンド関数経由で記録（アクセス元IPアドレスをサーバー側で取得するため）
    base44.functions
      .invoke("recordAccessLog", payload)
      .then((res) => {
        STATE.lastLogId = res?.data?.id ?? null;
      })
      .catch(() => {});
    STATE.pageEnteredAt = now;
  } catch {
    // ログ保存失敗は画面に影響させない
  }
}

/**
 * ページ離脱・非表示時に現在ページの滞在時間を確定させる
 */
export function flushStayTime() {
  try {
    if (!STATE.lastLogId) return;
    const staySeconds = (Date.now() - STATE.pageEnteredAt) / 1000;
    if (staySeconds < 1) return;
    base44.functions
      .invoke("recordAccessLog", {
        update_log_id: STATE.lastLogId,
        stay_seconds: staySeconds,
      })
      .catch(() => {});
  } catch {
    // ログ保存失敗は画面に影響させない
  }
}

/**
 * ボタン・リンクなどの操作をInteractionLogとして非同期記録する（fire-and-forget・失敗は無視）
 */
export function trackInteraction({ pagePath, actionType, elementType, elementLabel, elementValue, user }) {
  try {
    const portalAcastId = localStorage.getItem(PORTAL_ACAST_KEY) || "";
    base44.functions
      .invoke("recordInteractionLog", {
        page_path: pagePath || "/",
        action_type: actionType === "change" ? "change" : "click",
        element_type: elementType || "",
        element_label: elementLabel || "",
        element_value: elementValue || "",
        auth_type: user ? "app_user" : portalAcastId ? "portal_staff" : "anonymous",
        user_email: user?.email || "",
        user_role: user?.role || "",
        portal_acast_id: portalAcastId,
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
      })
      .catch(() => {});
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