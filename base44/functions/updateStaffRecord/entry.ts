import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    const body = await req.json().catch(() => ({}));
    const { action, staffId, data } = body;

    if (action === 'create') {
      if (!data?.event_id || !data?.name) {
        return Response.json({ error: 'event_id and name are required' }, { status: 400 });
      }
      const staff = await base44.asServiceRole.entities.Staff.create(data);
      return Response.json({ staff });
    }

    if (action === 'update') {
      if (!staffId || !data) {
        return Response.json({ error: 'staffId and data are required' }, { status: 400 });
      }
      const staff = await base44.asServiceRole.entities.Staff.update(staffId, data);
      return Response.json({ staff });
    }

    if (action === 'delete') {
      if (!staffId) {
        return Response.json({ error: 'staffId is required' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Staff.delete(staffId);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});