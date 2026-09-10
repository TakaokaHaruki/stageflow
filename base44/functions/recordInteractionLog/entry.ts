import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * ボタン・リンクなどの操作をInteractionLogへ記録する。
 * 未ログイン（ポータル・匿名）訪問者の操作も対象のためservice roleで作成し、
 * クライアントから取得できないアクセス元IPアドレスはヘッダーから取得する。
 */
export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const str = (v, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
    const base44 = createClientFromRequest(req);

    const pagePath = str(body.page_path);
    const elementLabel = str(body.element_label, 200);
    if (!pagePath || !elementLabel) {
      return Response.json({ ok: true });
    }

    const h = req.headers;
    const ip =
      (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
      str(h.get("cf-connecting-ip"), 100) ||
      "";

    const loggedAtJst = new Date()
      .toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" })
      .replace("T", " ")
      .slice(0, 16);

    await base44.asServiceRole.entities.InteractionLog.create({
      page_path: pagePath,
      action_type: body.action_type === "change" ? "change" : "click",
      element_type: str(body.element_type, 50),
      element_label: elementLabel,
      element_value: str(body.element_value, 200),
      ip_address: ip,
      auth_type: ["anonymous", "app_user", "portal_staff"].includes(body.auth_type) ? body.auth_type : "anonymous",
      user_email: str(body.user_email, 200),
      user_role: str(body.user_role, 50),
      portal_acast_id: str(body.portal_acast_id, 100),
      visitor_id: str(body.visitor_id, 64),
      session_id: str(body.session_id, 64),
      logged_at_jst: loggedAtJst,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}