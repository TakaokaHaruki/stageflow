import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const unique = (items = []) => [...new Set(items.filter(Boolean))];

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

    const body = await req.json().catch(() => ({}));
    const { action, eventId } = body;
    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    if (action === 'setSplitBySide') {
      const { positionTypeId, positionTypeName, split_by_side } = body;
      if (!positionTypeId || !positionTypeName) {
        return Response.json({ error: 'positionTypeId and positionTypeName are required' }, { status: 400 });
      }

      const splitBySide = Boolean(split_by_side);
      const positions = await base44.entities.Position.filter({ event_id: eventId });
      const matchingPositions = positions.filter((p) => p.name === positionTypeName);

      const updatedPositions = [];
      for (const position of matchingPositions) {
        let staffNames;
        if (splitBySide) {
          staffNames = unique(position.staff_names || []);
        } else {
          const kamite = position.staff_names_kamite || [];
          const shimote = position.staff_names_shimote || [];
          staffNames = unique([...kamite, ...shimote]);
        }
        const updated = await base44.entities.Position.update(position.id, { staff_names: staffNames });
        updatedPositions.push({
          ...(updated || position),
          id: position.id,
          split_by_side: splitBySide,
          staff_names: staffNames,
        });
      }

      return Response.json({ positions: updatedPositions });
    }

    if (action === 'updatePositionStaff') {
      const { positionId } = body;
      if (!positionId) {
        return Response.json({ error: 'positionId is required' }, { status: 400 });
      }

      const allowedFields = [
        'name', 'time_slot', 'notes', 'color',
        'map_x', 'map_y', 'map_x_kamite', 'map_y_kamite', 'map_x_shimote', 'map_y_shimote',
        'required_count', 'order',
      ];
      const extraFields = Object.fromEntries(
        allowedFields
          .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
          .map((field) => [field, body[field]])
      );

      const splitBySide = Object.prototype.hasOwnProperty.call(body, 'split_by_side')
        ? Boolean(body.split_by_side)
        : false;

      const kamite = body.staff_names_kamite ? unique(body.staff_names_kamite) : [];
      const shimote = body.staff_names_shimote ? unique(body.staff_names_shimote) : [];

      let staffNames;
      if (splitBySide) {
        staffNames = unique([...kamite, ...shimote]);
      } else if (Object.prototype.hasOwnProperty.call(body, 'staff_names')) {
        staffNames = unique(body.staff_names);
      } else {
        const current = await base44.entities.Position.get(positionId);
        staffNames = unique(current?.staff_names || []);
      }

      const position = await base44.entities.Position.update(positionId, {
        ...extraFields,
        staff_names: staffNames,
      });

      return Response.json({
        position: {
          ...(position || {}),
          id: positionId,
          staff_names: staffNames,
          staff_names_kamite: kamite,
          staff_names_shimote: shimote,
          split_by_side: splitBySide,
        },
      });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});