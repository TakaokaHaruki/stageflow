import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ALLOWED_FIELDS = ['chief_staff_name'];

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

    const { eventId, chief_staff_name } = await req.json();
    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    const nextChiefName = chief_staff_name || '';
    const event = await base44.asServiceRole.entities.Event.update(eventId, {
      chief_staff_name: nextChiefName,
    });

    return Response.json({ event: { ...(event || {}), id: eventId, chief_staff_name: nextChiefName } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});