import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildFullComparison, normalizeBackupData } from "../../shared/eventBackup.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'chief') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const { older_id, newer_id } = body;
    if (!older_id || !newer_id) return Response.json({ error: 'older_id and newer_id required' }, { status: 400 });
    if (older_id === newer_id) return Response.json({ error: 'two different backups are required' }, { status: 400 });

    const [older, newer] = await Promise.all([
      base44.entities.PositionBackup.get(older_id),
      base44.entities.PositionBackup.get(newer_id),
    ]);
    if (!older || !newer) return Response.json({ error: 'backup not found' }, { status: 404 });
    if (older.event_id !== newer.event_id) {
      return Response.json({ error: 'backups belong to different events' }, { status: 400 });
    }

    // 新しい方を第1引数に渡す: added=新しい方にのみ存在, removed=古い方にのみ存在
    const comparison = buildFullComparison(normalizeBackupData(newer), normalizeBackupData(older));
    return Response.json({ ok: true, comparison });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}