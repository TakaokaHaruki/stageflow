import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function jstNow() {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 16).replace('T', ' ');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const events = await svc.entities.Event.list("-date", 100);
    const results = [];
    for (const ev of events) {
      try {
        const positions = await svc.entities.Position.filter({ event_id: ev.id }, '-created_date', 500);
        const snapshot = positions.map((p) => {
          const { id, created_date, updated_date, created_by_id, ...rest } = p;
          return rest;
        });
        await svc.entities.PositionBackup.create({
          event_id: ev.id,
          label: '自動バックアップ',
          backup_data: snapshot,
          position_count: snapshot.length,
          is_auto: true,
          created_by_name: 'システム',
          created_at_jst: jstNow(),
        });
        // 自動バックアップは最新10件保持
        const autos = await svc.entities.PositionBackup.filter({ event_id: ev.id, is_auto: true }, '-created_date', 100);
        for (const a of autos.slice(10)) {
          try { await svc.entities.PositionBackup.delete(a.id); } catch (e) {}
        }
        // 全体で30件保持
        const allBk = await svc.entities.PositionBackup.filter({ event_id: ev.id }, '-created_date', 100);
        for (const a of allBk.slice(30)) {
          try { await svc.entities.PositionBackup.delete(a.id); } catch (e) {}
        }
        results.push({ event_id: ev.id, name: ev.name, count: snapshot.length });
      } catch (e) {
        results.push({ event_id: ev.id, name: ev.name, error: e.message });
      }
    }
    return Response.json({ ok: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}