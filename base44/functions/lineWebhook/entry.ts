import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const events = body.events ?? [];

    for (const event of events) {
      // グループ内のメッセージイベントのみ処理
      if (
        event.type !== 'message' ||
        event.message?.type !== 'text' ||
        event.source?.type !== 'group'
      ) continue;

      const text = event.message.text?.trim();
      if (text !== '登録') continue;

      const groupId = event.source.groupId;
      if (!groupId) continue;

      const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
      let groupName = groupId; // fallback

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

      // upsert: 既存のgroup_idがあれば更新、なければ作成
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
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});