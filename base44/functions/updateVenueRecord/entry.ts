import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      // unauthenticated
    }

    if (!user || (user.role !== 'admin' && user.role !== 'chief')) {
      return Response.json({ error: '権限がありません' }, { status: 403 });
    }

    const { action, id, data } = await req.json();

    if (action === 'create') {
      const result = await base44.asServiceRole.entities.Venue.create(data);
      return Response.json(result);
    }

    if (action === 'update') {
      const result = await base44.asServiceRole.entities.Venue.update(id, data);
      return Response.json(result);
    }

    if (action === 'delete') {
      const seatingMaps = await base44.asServiceRole.entities.SeatingMap.filter({ venue_id: id });
      await Promise.all(seatingMaps.map((map) => base44.asServiceRole.entities.SeatingMap.delete(map.id)));
      await base44.asServiceRole.entities.Venue.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: '不明なアクション' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
