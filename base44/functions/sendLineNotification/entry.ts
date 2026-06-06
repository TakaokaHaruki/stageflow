import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PRIORITY_EMOJI = {
  '緊急': '🚨',
  '重要': '⚠️',
  '通常': '📢',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Called from automation: payload has event + data
    const announcement = body.data;
    if (!announcement) {
      return Response.json({ error: 'No announcement data' }, { status: 400 });
    }

    const eventId = announcement.event_id;
    if (!eventId) {
      return Response.json({ skipped: true, reason: 'No event_id' });
    }

    // Fetch event to check LINE notify settings
    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    const event = events?.[0];

    if (!event?.line_notify_enabled || !event?.line_group_id) {
      console.log(`LINE notification skipped for event ${eventId}: notify disabled or no group ID`);
      return Response.json({ skipped: true, reason: 'LINE notify disabled or no group ID' });
    }

    const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
    const groupId = event.line_group_id;
    const baseUrl = (Deno.env.get('APP_BASE_URL') || '').replace(/\/$/, '');

    if (!token) {
      console.error('Missing LINE_CHANNEL_ACCESS_TOKEN');
      return Response.json({ error: 'LINE credentials not configured' }, { status: 500 });
    }

    const priority = announcement.priority || '通常';
    const emoji = PRIORITY_EMOJI[priority] || '📢';
    const title = announcement.title || '（件名なし）';
    const rawBody = announcement.body || '';
    const truncatedBody = rawBody.length > 100 ? rawBody.slice(0, 100) + '…' : rawBody;
    const detailUrl = `${baseUrl}/events/${eventId}`;

    const messageText = [
      `${emoji}【${priority}】${title}`,
      '',
      truncatedBody,
      '',
      `🔗 詳細はこちら: ${detailUrl}`,
    ].join('\n');

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text: messageText }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('LINE API error:', res.status, errText);
      return Response.json({ error: 'LINE API error', status: res.status, detail: errText }, { status: 500 });
    }

    console.log(`LINE notification sent for announcement: ${title}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('sendLineNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});