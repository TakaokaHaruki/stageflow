import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// 認証不要の公開エンドポイント：管理項目のみ更新可能
const ALLOWED_FIELDS = new Set([
  'pass_checked',
  'pass_number',
  'pass_returned',
  'penlight_checked',
  'penlight_number',
  'penlight_returned',
  'bento_day_checked',
  'bento_night_checked',
]);

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { eventId, staffId, field, value } = await req.json().catch(() => ({}));

    if (!eventId || !staffId || !field) {
      return Response.json({ error: 'eventId, staffId, field are required' }, { status: 400 });
    }
    if (!ALLOWED_FIELDS.has(field)) {
      return Response.json({ error: 'Field not allowed' }, { status: 400 });
    }

    // スタッフが対象イベントに属しているか検証
    const staff = await base44.asServiceRole.entities.Staff.get(staffId)
      .catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!staff || staff.event_id !== eventId) {
      return Response.json({ error: 'Staff not found in this event' }, { status: 404 });
    }

    // 番号フィールドは文字列、それ以外は boolean に正規化
    const normalizedValue = (field === 'pass_number' || field === 'penlight_number')
      ? String(value || '')
      : Boolean(value);

    await base44.asServiceRole.entities.Staff.update(staffId, { [field]: normalizedValue });

    return Response.json({ ok: true, staffId, field, value: normalizedValue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}