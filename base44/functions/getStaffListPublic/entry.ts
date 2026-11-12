import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { eventId } = await req.json().catch(() => ({}));

    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    // 認証不要の公開エンドポイント：イベント情報とスタッフ管理項目のみ返す
    const event = await base44.asServiceRole.entities.Event.get(eventId)
      .catch((e: any) => (e.status === 404 ? null : Promise.reject(e)));
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const staff = await base44.asServiceRole.entities.Staff.filter({ event_id: eventId });

    // 管理に必要な項目のみに絞って返す
    const safeStaff = (staff || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      gender: s.gender || '',
      pass_checked: Boolean(s.pass_checked),
      pass_number: s.pass_number || '',
      pass_returned: Boolean(s.pass_returned),
      penlight_checked: Boolean(s.penlight_checked),
      penlight_number: s.penlight_number || '',
      penlight_returned: Boolean(s.penlight_returned),
      bento_day_checked: Boolean(s.bento_day_checked),
      bento_night_checked: Boolean(s.bento_night_checked),
    }));

    return Response.json({
      event: { name: event.name, date: event.date, venue: event.venue },
      staff: safeStaff,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}