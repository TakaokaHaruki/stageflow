import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function processEvents(req, events) {
  const base44 = createClientFromRequest(req);
  const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');

  for (const event of events) {
    if (
      event.type !== 'message' ||
      event.message?.type !== 'text' ||
      event.source?.type !== 'group'
    ) continue;

    const text = event.message.text?.trim();
    if (text !== '登録') continue;

    const groupId = event.source.groupId;
    if (!groupId) continue;

    try {
      let groupName = groupId;

      if (token) {
        const summaryRes = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          groupName = summary.groupName ?? groupId;
        }
      }

      const detectedAt = new Date(event.timestamp).toISOString();

      const existing = await base44.asServiceRole.entities.DetectedLineGroup.filter({ group_id: groupId });
      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.DetectedLineGroup.update(existing[0].id, {
          group_name: groupName,
          detected_at: detectedAt,
        });
      } else {
        await base44.asServiceRole.entities.DetectedLineGroup.create({
          group_id: groupId,
          group_name: groupName,
          detected_at: detectedAt,
        });
      }
    } catch (err) {
      console.error(`Failed to process group ${groupId}:`, err.message);
    }
  }
}

Deno.serve(async (req) => {
  let events = [];
  try {
    const body = await req.json();
    events = body.events ?? [];
  } catch (_) {
    // bodyのパース失敗でも200を返す
  }

  // fire-and-forget: 即座に200を返し、バックグラウンドで処理
  processEvents(req, events).catch((err) => console.error('processEvents error:', err.message));

  return Response.json({ ok: true });
});