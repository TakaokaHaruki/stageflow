import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'chief') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const backup_id = body.backup_id;
    if (!backup_id) return Response.json({ error: 'backup_id required' }, { status: 400 });

    const backup = await base44.entities.PositionBackup.get(backup_id);
    if (!backup) return Response.json({ error: 'backup not found' }, { status: 404 });
    const event_id = backup.event_id;
    const data = Array.isArray(backup.backup_data) ? backup.backup_data : [];

    // 現在の該当イベントのポジションを全削除
    const existing = await base44.entities.Position.filter({ event_id }, '-created_date', 500);
    for (const p of existing) {
      try { await base44.entities.Position.delete(p.id); } catch (e) {}
    }

    // バックアップから復元
    if (data.length) {
      await base44.entities.Position.bulkCreate(data);
    }

    return Response.json({ ok: true, restored: data.length, deleted: existing.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}