import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return '"' + s.replace(/"/g, '""') + '"';
};

const REF_LABELS = { internal: "アプリ内", direct: "直接", search: "検索", sns: "SNS", external: "外部リンク" };
const AUTH_LABELS = { app_user: "アプリ", portal_staff: "ポータル", anonymous: "未ログイン" };
const DEVICE_LABELS = { mobile: "モバイル", tablet: "タブレット", desktop: "PC" };
const VIEW_TYPE_LABELS = { announcement_open: "お知らせ", file_open: "配布資料", tab_open: "タブ", item_expand: "項目展開" };

/**
 * アクセス履歴・閲覧操作ログを期間指定でCSV出力する（管理者専用）。
 * UTF-8 with BOM・Excel対応。target: "access" | "view"
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const target = body.target === "view" ? "view" : "access";
    const from = typeof body.date_from === "string" && body.date_from ? body.date_from + " 00:00" : "";
    const to = typeof body.date_to === "string" && body.date_to ? body.date_to + " 23:59" : "";
    const q = {};
    if (from || to) {
      q.logged_at_jst = {};
      if (from) q.logged_at_jst.$gte = from;
      if (to) q.logged_at_jst.$lte = to;
    }

    let header = [];
    let rows = [];
    if (target === "access") {
      const logs = await base44.entities.AccessLog.filter(q, "-created_date", 5000);
      // セッションごとの最終アクセスを離脱ページとして判定（降順で最初に出現したもの）
      const seenSessions = new Set();
      for (const l of logs) {
        if (l.session_id && !seenSessions.has(l.session_id)) {
          seenSessions.add(l.session_id);
          l.__exit = true;
        }
      }
      header = [
        "記録日時", "ページパス", "クエリ", "遷移元パス", "流入元分類", "流入元URL", "IPアドレス",
        "デバイス", "ブラウザ", "OS", "画面サイズ", "認証状況", "メールアドレス", "ロール",
        "A-CAST ID", "訪問者ID", "セッションID", "滞在秒数", "離脱ページ",
      ];
      rows = logs.map((l) => [
        l.logged_at_jst, l.page_path, l.query, l.from_path,
        REF_LABELS[l.referrer_type] || l.referrer_type || "", l.referrer, l.ip_address,
        DEVICE_LABELS[l.device_type] || l.device_type, l.browser, l.os, l.screen_size,
        AUTH_LABELS[l.auth_type] || l.auth_type, l.user_email, l.user_role, l.portal_acast_id,
        l.visitor_id, l.session_id, l.stay_seconds === null || l.stay_seconds === undefined ? "" : l.stay_seconds,
        l.__exit ? "○" : "",
      ]);
    } else {
      const logs = await base44.entities.ViewLog.filter(q, "-created_date", 5000);
      header = ["記録日時", "閲覧種別", "対象タイトル", "対象ID", "イベントID", "実行者名", "実行者メール"];
      rows = logs.map((l) => [
        l.logged_at_jst, VIEW_TYPE_LABELS[l.view_type] || l.view_type, l.target_title,
        l.target_id, l.event_id, l.actor_name, l.actor_email,
      ]);
    }

    const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    return Response.json({ csv, count: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}