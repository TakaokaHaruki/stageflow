import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_FIELDS = [
  'name', 'date', 'venue', 'description', 'status',
  'time_priority', 'time_open', 'time_start', 'time_end',
];

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

    const { eventId, data } = await req.json();
    if (!eventId || !data) {
      return Response.json({ error: 'eventId and data are required' }, { status: 400 });
    }

    // Only allow safe fields
    const safeData = Object.fromEntries(
      Object.entries(data).filter(([key]) => ALLOWED_FIELDS.includes(key))
    );

    const event = await base44.asServiceRole.entities.Event.update(eventId, safeData);
    return Response.json({ event });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});