import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { eventLockResponse } from '../../shared/eventLock.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'chief'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, staffId, data } = body;

    if (action === 'create') {
      if (!data?.event_id || !data?.name) {
        return Response.json({ error: 'event_id and name are required' }, { status: 400 });
      }
      const lockResp = await eventLockResponse(base44, data.event_id, user);
      if (lockResp) return lockResp;
      const staff = await base44.asServiceRole.entities.Staff.create(data);
      return Response.json({ staff });
    }

    if (action === 'update') {
      if (!staffId || !data) {
        return Response.json({ error: 'staffId and data are required' }, { status: 400 });
      }
      // 更新前に旧名を取得（名前変更時のポジション同期に使用）
      const previousStaff = await base44.asServiceRole.entities.Staff.get(staffId).catch(() => null);
      const oldName = previousStaff?.name;
      const oldEventId = previousStaff?.event_id;

      const lockResp = await eventLockResponse(base44, oldEventId, user);
      if (lockResp) return lockResp;

      let staff;
      try {
        staff = await base44.asServiceRole.entities.Staff.update(staffId, data);
      } catch (updErr) {
        if (String(updErr?.message || '').includes('not found')) {
          return Response.json({ error: 'Staff not found', not_found: true }, { status: 404 });
        }
        throw updErr;
      }

      // 名前変更時はポジション側の各種配列も同期する
      if (data.name && typeof data.name === 'string' && oldEventId) {
        const newName = data.name;
        if (oldName && oldName !== newName) {
          try {
            const positions = await base44.asServiceRole.entities.Position.filter({ event_id: oldEventId });
            await base44.asServiceRole.entities.Position.bulkUpdate(
              positions
                .filter((p) =>
                  (p.staff_names || []).includes(oldName) ||
                  (p.staff_names_kamite || []).includes(oldName) ||
                  (p.staff_names_shimote || []).includes(oldName) ||
                  p.chief_name === oldName ||
                  (p.chief_names || []).includes(oldName) ||
                  p.added_by === oldName
                )
                .map((p) => {
                  const update = {
                    id: p.id,
                    staff_names: (p.staff_names || []).map((n) => (n === oldName ? newName : n)),
                    staff_names_kamite: (p.staff_names_kamite || []).map((n) => (n === oldName ? newName : n)),
                    staff_names_shimote: (p.staff_names_shimote || []).map((n) => (n === oldName ? newName : n)),
                    chief_names: (p.chief_names || []).map((n) => (n === oldName ? newName : n)),
                  };
                  if (p.chief_name === oldName) update.chief_name = newName;
                  if (p.added_by === oldName) update.added_by = newName;
                  return update;
                })
            );
          } catch (syncErr) {
            console.error('Position name sync failed:', syncErr);
          }
        }
      }

      return Response.json({ staff });
    }

    if (action === 'delete') {
      if (!staffId) {
        return Response.json({ error: 'staffId is required' }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.Staff.get(staffId).catch(() => null);
      const lockResp = await eventLockResponse(base44, existing?.event_id, user);
      if (lockResp) return lockResp;
      await base44.asServiceRole.entities.Staff.delete(staffId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});