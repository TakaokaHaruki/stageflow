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

    const { eventId } = await req.json();
    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    const positions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
    const namesFromPositions = new Set();
    positions.forEach((pos) => {
      (pos.staff_names || []).forEach((name) => {
        const trimmed = name.trim();
        if (trimmed) namesFromPositions.add(trimmed);
      });
    });

    const existingStaff = await base44.asServiceRole.entities.Staff.filter({ event_id: eventId });
    const existingNames = new Set(existingStaff.map((s) => s.name));

    const missingNames = [...namesFromPositions].filter((name) => !existingNames.has(name));
    const created = [];
    for (const name of missingNames) {
      const staff = await base44.asServiceRole.entities.Staff.create({ event_id: eventId, name });
      created.push(staff);
    }

    return Response.json({
      existing: existingStaff.length,
      created: created.length,
      total: existingStaff.length + created.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});