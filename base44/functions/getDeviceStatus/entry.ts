import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getRestrictedFeatures } from "../../shared/deviceAuth.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { device_token } = await req.json().catch(() => ({}));
    const restricted_features = await getRestrictedFeatures(base44);

    if (!device_token) {
      return Response.json({ restricted_features, device: null });
    }

    let devices;
    try {
      devices = await base44.asServiceRole.entities.Device.filter({ token: device_token });
    } catch {
      return Response.json({ restricted_features, device: null });
    }
    if (!devices[0]) {
      return Response.json({ restricted_features, device: null });
    }

    const d = devices[0];
    const scope_matches = d.scope === 'user' ? d.target_user_id === user.id : true;

    // アクセス元IP（プロキシ経由を考慮しx-forwarded-forの先頭を採用）
    const h = req.headers;
    const client_ip =
      (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
      (h.get("cf-connecting-ip") || "").trim() ||
      "";

    return Response.json({
      restricted_features,
      device: {
        id: d.id,
        label: d.label,
        scope: d.scope,
        status: d.status,
        target_user_name: d.target_user_name,
        scope_matches,
      },
      client_ip,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}