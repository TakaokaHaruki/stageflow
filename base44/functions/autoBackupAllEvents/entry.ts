import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { collectEventRaw, cleanBackupData, backupSummary, jstNow } from "../../shared/eventBackup.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user && user.role !== 'admin' && user.role !== 'chief') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const is_auto = body.is_auto !== undefined ? !!body.is_auto : true;
    const label = body.label || (is_auto ? '自動バックアップ' : '全イベント一括バックアップ');
    const createdBy = user ? (user.full_name || user.email || '').toString() : 'システム';
    const svc = base44.asServiceRole;

    const events = await svc.entities.Event.list("-date", 100);
    const results = [];
    for (const ev of events) {
      try {
        const raw = await collectEventRaw(svc, ev.id);
        const backup_data = cleanBackupData(raw);
        const summary = backupSummary(backup_data);
        await svc.entities.PositionBackup.create({
          event_id: ev.id,
          label,
          backup_data,
          position_count: backup_data.positions.length,
          staff_count: backup_data.staff.length,
          summary,
          is_auto,
          created_by_name: createdBy,
          created_at_jst: jstNow(),
        });
        if (is_auto) {
          const autos = await svc.entities.PositionBackup.filter({ event_id: ev.id, is_auto: true }, '-created_date', 100);
          for (const a of autos.slice(10)) {
            try { await svc.entities.PositionBackup.delete(a.id); } catch (e) {}
          }
        }
        const allBk = await svc.entities.PositionBackup.filter({ event_id: ev.id }, '-created_date', 100);
        for (const a of allBk.slice(30)) {
          try { await svc.entities.PositionBackup.delete(a.id); } catch (e) {}
        }
        results.push({ event_id: ev.id, name: ev.name, summary });
      } catch (e) {
        results.push({ event_id: ev.id, name: ev.name, error: e.message });
      }
    }
    return Response.json({ ok: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}