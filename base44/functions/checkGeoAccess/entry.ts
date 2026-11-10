/**
 * 訪問者の国をIPベースで判定し、日本国内かどうかを返す。
 * 認証不要（ログイン前に実行される）。
 * 1. Cloudflareの cf-ipcountry ヘッダーを優先（エッジで付与される信頼度の高い国コード）
 * 2. なければ ipapi.co でIPから国判定（https・無料・キー不要）
 * 3. 判定不能時は fail-open（許可）とし、正規ユーザーの締め出しを防ぐ
 */
export default async function (req) {
  try {
    const h = req.headers;

    // アクセス元IP（recordAccessLogと同一の取得ロジック）
    const ip =
      (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
      (h.get("cf-connecting-ip") || "").trim() ||
      "";

    // 1. Cloudflare のエッジ国コード（信頼できる・レートリミットなし）
    const cfCountry = (h.get("cf-ipcountry") || "").trim().toUpperCase();

    let country = cfCountry;

    // 2. cf-ipcountry が無ければ ipapi.co で判定
    if (!country && ip) {
      try {
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.country === "string") {
            country = data.country.toUpperCase();
          }
        }
      } catch {
        /* API失敗時は country 未確定のまま fail-open */
      }
    }

    // 3. 判定不能時は許可（正規ユーザーの締め出し回避）
    const allowed = country ? country === "JP" : true;

    return Response.json({ allowed, country: country || "", ip });
  } catch (error) {
    // 予期せぬエラー時も fail-open
    return Response.json({ allowed: true, country: "", ip: "", error: error.message });
  }
}