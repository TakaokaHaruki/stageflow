import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'chief') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const eventId = body?.event_id;
    if (!eventId) return Response.json({ error: 'event_id is required' }, { status: 400 });

    // イベントに紐づく関連データをすべて削除（RLSを超えて確実に掃除するため service role）
    const svc = base44.asServiceRole;
    const q = { event_id: eventId };
    const related = {};
    related.Staff = await svc.entities.Staff.deleteMany(q);
    related.Position = await svc.entities.Position.deleteMany(q);
    related.OperationLog = await svc.entities.OperationLog.deleteMany(q);
    related.ViewLog = await svc.entities.ViewLog.deleteMany(q);
    related.SharedFile = await svc.entities.SharedFile.deleteMany(q);
    related.EmergencyContact = await svc.entities.EmergencyContact.deleteMany(q);
    related.PositionTypeOverride = await svc.entities.PositionTypeOverride.deleteMany(q);
    related.PositionSideSettings = await svc.entities.PositionSideSettings.deleteMany(q);
    related.PositionBackup = await svc.entities.PositionBackup.deleteMany(q);
    related.EditingPresence = await svc.entities.EditingPresence.deleteMany(q);
    // 最後にイベント本体を削除
    await svc.entities.Event.delete(eventId);

    return Response.json({ success: true, event_id: eventId, related });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}