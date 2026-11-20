import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jstNow } from "../../shared/eventBackup.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { device_id } = await req.json().catch(() => ({}));
    if (!device_id) return Response.json({ error: 'device_id required' }, { status: 400 });

    await base44.entities.Device.update(device_id, {
      status: 'revoked',
      revoked_at_jst: jstNow(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}