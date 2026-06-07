import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Handles Announcement CRUD operations via service role
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and chief can create/update/delete announcements
    const canEdit = user.role === 'admin' || user.role === 'chief';

    const { action, announcementId, data } = await req.json();

    if (action === 'create') {
      if (!canEdit) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!data?.event_id || !data?.title) {
        return Response.json({ error: 'event_id and title are required' }, { status: 400 });
      }
      const announcement = await base44.entities.Announcement.create(data);
      return Response.json({ announcement });
    }

    if (action === 'update') {
      if (!canEdit) return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!announcementId || !data) {
        return Response.json({ error: 'announcementId and data are required' }, { status: 400 });
      }
      const announcement = await base44.entities.Announcement.update(announcementId, data);
      return Response.json({ announcement });
    }

    if (action === 'delete') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      if (!announcementId) {
        return Response.json({ error: 'announcementId is required' }, { status: 400 });
      }
      await base44.entities.Announcement.delete(announcementId);
      return Response.json({ success: true });
    }

    // read_by update - any authenticated user can mark as read
    if (action === 'mark_read') {
      if (!announcementId || !data?.read_by) {
        return Response.json({ error: 'announcementId and read_by are required' }, { status: 400 });
      }
      const announcement = await base44.entities.Announcement.update(announcementId, { read_by: data.read_by });
      return Response.json({ announcement });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});