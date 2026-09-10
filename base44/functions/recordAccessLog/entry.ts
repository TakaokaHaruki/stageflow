import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * アプリ全体のページアクセスをAccessLogへ記録する。
 * クライアントから直接取得できないアクセス元IPアドレスを
 * リクエストヘッダーから取得して保存する。
 * 未ログイン（ポータル・匿名）訪問者も記録するためservice roleで作成する。
 */
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const str = (v, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
    const pagePath = str(body.page_path);
    if (!pagePath) {
      return Response.json({ error: "page_path is required" }, { status: 400 });
    }

    // アクセス元IP（プロキシ経由を考慮しx-forwarded-forの先頭を採用）
    const h = req.headers;
    const ip =
      (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
      str(h.get("cf-connecting-ip"), 100) ||
      "";

    const loggedAtJst = new Date()
      .toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" })
      .replace("T", " ")
      .slice(0, 16);

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.AccessLog.create({
      page_path: pagePath,
      from_path: str(body.from_path),
      referrer: str(body.referrer),
      query: str(body.query, 500),
      ip_address: ip,
      device_type: ["mobile", "tablet", "desktop"].includes(body.device_type) ? body.device_type : "desktop",
      user_agent: str(body.user_agent, 500),
      auth_type: ["anonymous", "app_user", "portal_staff"].includes(body.auth_type) ? body.auth_type : "anonymous",
      user_email: str(body.user_email, 200),
      user_role: str(body.user_role, 50),
      portal_acast_id: str(body.portal_acast_id, 100),
      logged_at_jst: loggedAtJst,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}