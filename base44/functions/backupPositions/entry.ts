import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function jstNow() {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 16).replace('T', ' ');
}

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

    // イベントの全ポジション取得（1ページ最大500件）
    const positions = await base44.entities.Position.filter({ event_id }, '-created_date', 500);

    // id/システム項目を除いたスナップショット
    const snapshot = positions.map((p) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = p;
      return rest;
    });

    const created = await base44.entities.PositionBackup.create({
      event_id,
      label,
      backup_data: snapshot,
      position_count: snapshot.length,
      is_auto,
      created_by_name: (user.full_name || user.email || '').toString(),
      created_at_jst: jstNow(),
    });

    // 自動バックアップは最新10件保持
    if (is_auto) {
      const autos = await base44.entities.PositionBackup.filter({ event_id, is_auto: true }, '-created_date', 100);
      for (const a of autos.slice(10)) {
        try { await base44.entities.PositionBackup.delete(a.id); } catch (e) {}
      }
    }
    // 全バックアップは最新30件保持
    const allBackups = await base44.entities.PositionBackup.filter({ event_id }, '-created_date', 100);
    for (const a of allBackups.slice(30)) {
      try { await base44.entities.PositionBackup.delete(a.id); } catch (e) {}
    }

    return Response.json({ ok: true, backup_id: created.id, position_count: snapshot.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}