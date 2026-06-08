import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_FIELDS = ['show_timeline', 'show_map', 'show_tasks', 'line_notify_enabled', 'line_group_id', 'active_preset_id'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get user from request headers directly (Base44 injects user info)
    const userInfoHeader = req.headers.get("x-base44-user");
    const user = userInfoHeader ? JSON.parse(userInfoHeader) : null;
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'chief'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { eventId, field, value } = await req.json();
    if (!eventId || !field) {
      return Response.json({ error: 'eventId and field are required' }, { status: 400 });
    }
    if (!ALLOWED_FIELDS.includes(field)) {
      return Response.json({ error: `Invalid field: ${field}` }, { status: 400 });
    }

    const event = await base44.asServiceRole.entities.Event.update(eventId, { [field]: value ?? null });
    return Response.json({ event });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});