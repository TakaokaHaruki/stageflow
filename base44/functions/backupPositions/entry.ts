import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { collectEventRaw, cleanBackupData, backupSummary, jstNow } from "../../shared/eventBackup.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'chief') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const event_id = body.event_id;
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
    const is_auto = !!body.is_auto;
    const label = body.label || (is_auto ? '自動バックアップ' : '手動バックアップ');

    const raw = await collectEventRaw(base44, event_id);
    const backup_data = cleanBackupData(raw);
    const summary = backupSummary(backup_data);

    const created = await base44.entities.PositionBackup.create({
      event_id,
      label,
      backup_data,
      position_count: backup_data.positions.length,
      staff_count: backup_data.staff.length,
      summary,
      is_auto,
      created_by_name: (user.full_name || user.email || '').toString(),
      created_at_jst: jstNow(),
    });

    if (is_auto) {
      const autos = await base44.entities.PositionBackup.filter({ event_id, is_auto: true }, '-created_date', 100);
      for (const a of autos.slice(10)) {
        try { await base44.entities.PositionBackup.delete(a.id); } catch (e) {}
      }
    }
    const allBackups = await base44.entities.PositionBackup.filter({ event_id }, '-created_date', 100);
    for (const a of allBackups.slice(30)) {
      try { await base44.entities.PositionBackup.delete(a.id); } catch (e) {}
    }

    return Response.json({ ok: true, backup_id: created.id, summary, counts: { positions: backup_data.positions.length, staff: backup_data.staff.length } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}