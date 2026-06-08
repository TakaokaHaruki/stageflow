import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'chief'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, id, data, updates } = await req.json();

    if (action === 'create') {
      const record = await base44.asServiceRole.entities.PositionType.create(data);
      return Response.json({ record });
    }

    if (action === 'update') {
      const record = await base44.asServiceRole.entities.PositionType.update(id, data);
      return Response.json({ record });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.PositionType.delete(id);
      return Response.json({ ok: true });
    }

    if (action === 'reorder') {
      // updates: [{id, order}]
      await Promise.all(updates.map(({ id: ptId, order }) =>
        base44.asServiceRole.entities.PositionType.update(ptId, { order })
      ));
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});