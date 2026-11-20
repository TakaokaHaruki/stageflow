import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jstNow } from "../../shared/eventBackup.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { label, scope, target_user_id, target_user_name } = await req.json().catch(() => ({}));
    if (!label) return Response.json({ error: 'label required' }, { status: 400 });
    if (scope === 'user' && !target_user_id) {
      return Response.json({ error: 'target_user_id required for user scope' }, { status: 400 });
    }

    const token = crypto.randomUUID();
    const device = await base44.entities.Device.create({
      token,
      label,
      scope: scope === 'user' ? 'user' : 'shared',
      target_user_id: scope === 'user' ? target_user_id : '',
      target_user_name: scope === 'user' ? target_user_name : '',
      status: 'pending',
      registered_by_name: (user.full_name || user.email || '').toString(),
      registered_at_jst: jstNow(),
    });

    const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clewly.jp';
    const activationUrl = `${appUrl}/devices/activate?token=${token}`;

    return Response.json({
      ok: true,
      device_id: device.id,
      device_token: token,
      activation_url: activationUrl,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}