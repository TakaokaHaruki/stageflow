import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { collectEventRaw, cleanBackupData, buildFullComparison, restoreEventBackup, ENTITY_MAP } from "../../shared/eventBackup.ts";

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
    const compare_only = !!body.compare_only;

    const backup = await base44.entities.PositionBackup.get(backup_id);
    if (!backup) return Response.json({ error: 'backup not found' }, { status: 404 });
    const event_id = backup.event_id;

    // バックアップデータ正規化（旧形式=ポジション配列のみ 互換）
    let backupData;
    if (Array.isArray(backup.backup_data)) {
      backupData = { positions: backup.backup_data };
    } else {
      backupData = backup.backup_data || {};
    }
    for (const k of Object.keys(ENTITY_MAP)) {
      if (!backupData[k]) backupData[k] = [];
    }

    const rawCurrent = await collectEventRaw(base44, event_id);
    const currentClean = cleanBackupData(rawCurrent);
    const comparison = buildFullComparison(backupData, currentClean);

    if (compare_only) {
      return Response.json({ ok: true, event_id, backup_label: backup.label, backup_created_at_jst: backup.created_at_jst, comparison });
    }

    const result = await restoreEventBackup(base44, event_id, backupData);
    return Response.json({ ok: true, comparison, deleted: result.deleted, restored: result.restored });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}