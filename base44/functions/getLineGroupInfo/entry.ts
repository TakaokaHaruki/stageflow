import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await req.json();
    if (!groupId) return Response.json({ error: 'groupId is required' }, { status: 400 });

    const token = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
    if (!token) return Response.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 });

    const summaryRes = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!summaryRes.ok) {
      return Response.json({ error: 'group_not_found', status: summaryRes.status });
    }

    const summary = await summaryRes.json();

    // Try to get member count
    let memberCount = null;
    const memberRes = await fetch(`https://api.line.me/v2/bot/group/${groupId}/members/count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (memberRes.ok) {
      const memberData = await memberRes.json();
      memberCount = memberData.count ?? null;
    }

    return Response.json({
      groupName: summary.groupName,
      pictureUrl: summary.pictureUrl,
      memberCount,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});