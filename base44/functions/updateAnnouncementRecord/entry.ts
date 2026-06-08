import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, announcementId, data } = await req.json();
    const isPrivileged = ['admin', 'chief'].includes(user.role);

    if (action === 'create') {
      if (!isPrivileged) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!data?.event_id || !data?.title || !data?.body) {
        return Response.json({ error: 'event_id, title, and body are required' }, { status: 400 });
      }
      const announcement = await base44.asServiceRole.entities.Announcement.create(data);
      return Response.json({ announcement });
    }

    if (action === 'update') {
      if (!isPrivileged) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!announcementId || !data) {
        return Response.json({ error: 'announcementId and data are required' }, { status: 400 });
      }
      const announcement = await base44.asServiceRole.entities.Announcement.update(announcementId, data);
      return Response.json({ announcement });
    }

    if (action === 'delete') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!announcementId) {
        return Response.json({ error: 'announcementId is required' }, { status: 400 });
      }
      await base44.asServiceRole.entities.Announcement.delete(announcementId);
      return Response.json({ success: true });
    }

    // Allow any authenticated user to update read_by
    if (action === 'markRead') {
      if (!announcementId || !data?.read_by) {
        return Response.json({ error: 'announcementId and read_by are required' }, { status: 400 });
      }
      const announcement = await base44.asServiceRole.entities.Announcement.update(announcementId, { read_by: data.read_by });
      return Response.json({ announcement });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});