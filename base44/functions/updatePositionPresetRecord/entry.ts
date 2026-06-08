import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, id, data } = await req.json();

    if (action === 'create') {
      const record = await base44.entities.PositionPreset.create(data);
      return Response.json({ record });
    }

    if (action === 'update') {
      const record = await base44.entities.PositionPreset.update(id, data);
      return Response.json({ record });
    }

    if (action === 'delete') {
      await base44.entities.PositionPreset.delete(id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});