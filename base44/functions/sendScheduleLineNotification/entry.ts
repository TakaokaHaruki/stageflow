import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// 各時間帯の日本語ラベル
const TIME_LABELS = {
  time_open_pre: '先行',
  time_open: '開場',
  time_start: '開演',
  time_end: '終演',
};

// "HH:MM" + date → UTC Date
function toDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00+09:00`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || '';

    if (!token) {
      return Response.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 });
    }

    // LINE通知有効・グループID設定済みのイベントをすべて取得
    const allEvents = await base44.asServiceRole.entities.Event.list();
    const activeEvents = allEvents.filter(e => e.line_notify_enabled && e.line_group_id && e.date);

    const now = new Date();
    const results = [];

    for (const event of activeEvents) {
      const timeFields = ['time_open_pre', 'time_open', 'time_start', 'time_end'];

      for (const field of timeFields) {
        const timeValue = event[field];
        if (!timeValue) continue;

        const targetTime = toDateTime(event.date, timeValue);
        if (!targetTime) continue;

        const diffMs = targetTime.getTime() - now.getTime();
        const diffMin = diffMs / 1000 / 60;

        // 30分前（±2.5分の余裕）または 15分前（±2.5分の余裕）
        const is30 = diffMin >= 27.5 && diffMin < 32.5;
        const is15 = diffMin >= 12.5 && diffMin < 17.5;

        if (!is30 && !is15) continue;

        const minutesBefore = is30 ? 30 : 15;
        const label = TIME_LABELS[field] || field;
        const detailUrl = `${appBaseUrl}/events/${event.id}`;

        const messageText = [
          `⏰【${event.name}】`,
          `${label}まであと${minutesBefore}分です`,
          `📅 ${event.date.replace(/-/g, '/')}`,
          event.venue ? `📍 ${event.venue}` : '',
          '',
          `🔗 詳細: ${detailUrl}`,
        ].filter(l => l !== null && l !== undefined).join('\n').replace(/\n\n\n+/g, '\n\n');

        const res = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: event.line_group_id,
            messages: [{ type: 'text', text: messageText }],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`LINE push error for event ${event.id} field ${field}:`, res.status, errText);
          results.push({ eventId: event.id, field, minutesBefore, success: false, error: errText });
        } else {
          console.log(`Notified: ${event.name} - ${label} ${minutesBefore}min before`);
          results.push({ eventId: event.id, field, minutesBefore, success: true });
        }
      }
    }

    return Response.json({ results, checkedAt: now.toISOString() });
  } catch (error) {
    console.error('sendScheduleLineNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});