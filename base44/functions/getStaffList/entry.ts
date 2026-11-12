import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'chief') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    const staff = await base44.asServiceRole.entities.Staff.filter({ event_id: eventId });
    return Response.json({ staff: staff || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});