import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyDeviceAccess } from "../../shared/deviceAuth.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'chief') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { eventId, type, device_token } = await req.json();

    const access = await verifyDeviceAccess(base44, device_token, 'export_pdf');
    if (!access.allowed) {
      return Response.json({ error: 'この機能は貸与端末限定です', reason: access.reason }, { status: 403 });
    }

    if (!eventId) {
      return Response.json({ error: 'eventId required' }, { status: 400 });
    }

    const event = await base44.entities.Event.get(eventId);
    const positions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
    const staff = await base44.asServiceRole.entities.Staff.filter({ event_id: eventId });

    console.log('PDF Export:', { eventId, positionCount: positions?.length, staffCount: staff?.length });

    return Response.json({ event, positions: positions || [], staff: staff || [], type });
  } catch (error) {
    console.error('PDF Export Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});