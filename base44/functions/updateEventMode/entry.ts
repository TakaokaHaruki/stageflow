import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_FIELDS = ['staff_management_mode', 'assignment_mode', 'venue_map_mode'];
const ALLOWED_MODES = ['edit', 'public'];

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

    const { eventId, field, mode } = await req.json();
    if (!eventId || !field || !mode) {
      return Response.json({ error: 'eventId, field, and mode are required' }, { status: 400 });
    }
    if (!ALLOWED_FIELDS.includes(field)) {
      return Response.json({ error: `Invalid field: ${field}` }, { status: 400 });
    }
    if (!ALLOWED_MODES.includes(mode)) {
      return Response.json({ error: `Invalid mode: ${mode}` }, { status: 400 });
    }

    const event = await base44.asServiceRole.entities.Event.update(eventId, { [field]: mode });
    return Response.json({ event });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});