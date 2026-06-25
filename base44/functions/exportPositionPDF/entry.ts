import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { eventId, type } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await base44.entities.Event.get(eventId);
    const positions = await base44.entities.Position.filter({ event_id: eventId });
    const staff = await base44.entities.Staff.filter({ event_id: eventId });

    return Response.json({ event, positions, staff, type });
  } catch (error) {
    console.error('PDF Export Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});