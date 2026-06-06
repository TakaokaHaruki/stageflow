import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// 各時間帯の表示名
const TIME_LABELS = {
  time_priority: '先行',
  time_open: '開場',
  time_start: '開演',
  time_end: '終演',
};

// HH:MM を今日の Date オブジェクトに変換（JST）
function toJSTDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  // dateStr は YYYY-MM-DD (JST)
  const dt = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+09:00`);
  return dt;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
    const baseUrl = (Deno.env.get('APP_BASE_URL') || '').replace(/\/$/, '');

    if (!token) {
      return Response.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 });
    }

    // 現在時刻（UTC）
    const now = new Date();

    // LINE通知が有効なイベントを全件取得
    const allEvents = await base44.asServiceRole.entities.Event.list();
    const activeEvents = allEvents.filter(e => e.line_notify_enabled && e.line_group_id && e.date);

    const results = [];

    for (const event of activeEvents) {
      const timeFields = ['time_priority', 'time_open', 'time_start', 'time_end'];

      for (const field of timeFields) {
        const timeValue = event[field];
        if (!timeValue) continue;

        const targetTime = toJSTDate(event.date, timeValue);
        if (!targetTime) continue;

        // 30分前・15分前チェック（±2分の窓）
        for (const minutesBefore of [30, 15]) {
          const notifyTime = new Date(targetTime.getTime() - minutesBefore * 60 * 1000);
          const diffMs = Math.abs(now.getTime() - notifyTime.getTime());

          // 2分以内なら送信（5分間隔スケジューラーの場合は±2.5分に調整可）
          if (diffMs > 2 * 60 * 1000) continue;

          const label = TIME_LABELS[field] || field;
          const timeDisplay = timeValue;
          const detailUrl = `${baseUrl}/events/${event.id}`;

          const messageText = [
            `🔔【${event.name}】`,
            `${label}（${timeDisplay}）まであと${minutesBefore}分です`,
            '',
            `📍 ${event.venue || ''}`,
            `🔗 ${detailUrl}`,
          ].filter(line => line !== '📍 ').join('\n');

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
            console.error(`LINE push failed for event ${event.id} field ${field} -${minutesBefore}min:`, errText);
            results.push({ event: event.name, field, minutesBefore, success: false, error: errText });
          } else {
            console.log(`Sent LINE notification: ${event.name} ${label} -${minutesBefore}min`);
            results.push({ event: event.name, field, minutesBefore, success: true });
          }
        }
      }
    }

    return Response.json({ checked: activeEvents.length, sent: results.filter(r => r.success).length, results });
  } catch (error) {
    console.error('sendEventTimeNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});