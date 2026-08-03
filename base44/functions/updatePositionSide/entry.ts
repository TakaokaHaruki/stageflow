import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const unique = (items = []) => [...new Set(items.filter(Boolean))];
const ALLOWED_UPDATE_FIELDS = ['order', 'required_count', 'notes', 'color', 'map_x', 'map_y', 'map_x_kamite', 'map_y_kamite', 'map_x_shimote', 'map_y_shimote', 'category'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'chief'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, eventId } = body;
    // eventId 必須アクション：create, setSplitBySide（event_id で検索するため）
    if (!eventId && ['createPosition', 'createPositions', 'setSplitBySide'].includes(action)) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    // 新規：単一 Position 作成
    if (action === 'createPosition') {
      const { position } = body;
      if (!position || !position.name || !position.time_slot) {
        return Response.json({ error: 'position with name and time_slot is required' }, { status: 400 });
      }
      const created = await base44.asServiceRole.entities.Position.create({ ...position, event_id: eventId });
      return Response.json({ position: created });
    }

    // 新規：複数 Position 並行作成
    if (action === 'createPositions') {
      const { positions } = body;
      if (!Array.isArray(positions) || positions.length === 0) {
        return Response.json({ error: 'positions array is required' }, { status: 400 });
      }
      const created = await Promise.all(
        positions.map((p) => base44.asServiceRole.entities.Position.create({ ...p, event_id: eventId }))
      );
      return Response.json({ positions: created });
    }

    // 新規：単一 Position 削除
    if (action === 'deletePosition') {
      const { positionId } = body;
      if (!positionId) {
        return Response.json({ error: 'positionId is required' }, { status: 400 });
      }
      try {
        await base44.asServiceRole.entities.Position.delete(positionId);
      } catch (delErr) {
        if (String(delErr?.message || '').includes('not found')) {
          return Response.json({ ok: true, not_found: true });
        }
        throw delErr;
      }
      return Response.json({ ok: true });
    }

    // 新規：複数 Position 並行削除
    if (action === 'deletePositions') {
      const { positionIds } = body;
      if (!Array.isArray(positionIds) || positionIds.length === 0) {
        return Response.json({ error: 'positionIds array is required' }, { status: 400 });
      }
      await Promise.all(positionIds.map((id) => base44.asServiceRole.entities.Position.delete(id)));
      return Response.json({ ok: true });
    }

    // 新規：Position フィールド更新（order, required_count など）
    if (action === 'updatePositionFields') {
      const { positionId, data } = body;
      if (!positionId || !data) {
        return Response.json({ error: 'positionId and data are required' }, { status: 400 });
      }
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key))
      );
      let updated;
      try {
        updated = await base44.asServiceRole.entities.Position.update(positionId, filteredData);
      } catch (updErr) {
        if (String(updErr?.message || '').includes('not found')) {
          return Response.json({ error: 'Position not found', not_found: true }, { status: 404 });
        }
        throw updErr;
      }
      return Response.json({ position: updated });
    }

    // 既存：split_by_side トグル
    if (action === 'setSplitBySide') {
      const { positionTypeId, positionTypeName, split_by_side, sideSettings } = body;
      if (!positionTypeId || !positionTypeName) {
        return Response.json({ error: 'positionTypeId and positionTypeName are required' }, { status: 400 });
      }

      const splitBySide = Boolean(split_by_side);
      const positions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
      const matchingPositions = positions.filter((p) => p.name === positionTypeName);

      // PositionType の split_by_side も更新（他ユーザーへの反映のため）
      await base44.asServiceRole.entities.PositionType.update(positionTypeId, { split_by_side: splitBySide });

      const updatedPositions = [];
      for (const position of matchingPositions) {
        const posSettings = (sideSettings?.positions || {})[position.id] || {};
        let staffNames, kamite, shimote;
        if (splitBySide) {
          staffNames = unique(position.staff_names || []);
          kamite = posSettings.staff_names_kamite || position.staff_names || [];
          shimote = posSettings.staff_names_shimote || [];
        } else {
          const existingKamite = position.staff_names_kamite || [];
          const existingShimote = position.staff_names_shimote || [];
          staffNames = unique([...existingKamite, ...existingShimote]);
          kamite = [];
          shimote = [];
        }
        const updated = await base44.asServiceRole.entities.Position.update(position.id, {
          staff_names: staffNames,
          split_by_side: splitBySide,
          staff_names_kamite: kamite,
          staff_names_shimote: shimote,
        });
        updatedPositions.push({
          ...(updated || position),
          id: position.id,
          split_by_side: splitBySide,
          staff_names: staffNames,
          staff_names_kamite: kamite,
          staff_names_shimote: shimote,
        });
      }

      // PositionSideSettings に保存（upsert、失敗時は Position 本体の保存を優先して続行）
      if (sideSettings) {
        try {
          const existing = (await base44.asServiceRole.entities.PositionSideSettings.filter({ event_id: eventId }))[0];
          const payload = { ...sideSettings, event_id: eventId, updated_at: new Date().toISOString() };
          if (existing?.id) {
            await base44.asServiceRole.entities.PositionSideSettings.update(existing.id, payload);
          } else {
            await base44.asServiceRole.entities.PositionSideSettings.create(payload);
          }
        } catch (sideErr) {
          console.error("PositionSideSettings save failed (non-critical)", sideErr);
        }
      }

      return Response.json({ positions: updatedPositions });
    }

    // 既存：Position スタッフ更新
    if (action === 'updatePositionStaff') {
      const { positionId } = body;
      if (!positionId) {
        return Response.json({ error: 'positionId is required' }, { status: 400 });
      }

      const allowedFields = [
        'name', 'time_slot', 'notes', 'color', 'category',
        'map_x', 'map_y', 'map_x_kamite', 'map_y_kamite', 'map_x_shimote', 'map_y_shimote',
        'required_count', 'order',
      ];
      const extraFields = Object.fromEntries(
        allowedFields
          .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
          .map((field) => [field, body[field]])
      );

      // split_by_side / staff_names_kamite / staff_names_shimote がbodyに含まれない場合、
      // DBの現在値を保持してデフォルトfalse/空配列での上書きを防ぐ
      const hasSplitInBody = Object.prototype.hasOwnProperty.call(body, 'split_by_side');
      const hasKamiteInBody = Object.prototype.hasOwnProperty.call(body, 'staff_names_kamite');
      const hasShimoteInBody = Object.prototype.hasOwnProperty.call(body, 'staff_names_shimote');
      const hasStaffNamesInBody = Object.prototype.hasOwnProperty.call(body, 'staff_names');

      const needCurrent = !hasSplitInBody || !hasKamiteInBody || !hasShimoteInBody || !hasStaffNamesInBody;
      const current = needCurrent
        ? await base44.asServiceRole.entities.Position.get(positionId).catch(() => null)
        : null;

      const splitBySide = hasSplitInBody ? Boolean(body.split_by_side) : Boolean(current?.split_by_side);
      const kamite = hasKamiteInBody ? unique(body.staff_names_kamite) : unique(current?.staff_names_kamite || []);
      const shimote = hasShimoteInBody ? unique(body.staff_names_shimote) : unique(current?.staff_names_shimote || []);

      let staffNames;
      if (splitBySide) {
        staffNames = unique([...kamite, ...shimote]);
      } else if (hasStaffNamesInBody) {
        staffNames = unique(body.staff_names);
      } else {
        staffNames = unique(current?.staff_names || []);
      }

      let position;
      try {
        position = await base44.asServiceRole.entities.Position.update(positionId, {
          ...extraFields,
          staff_names: staffNames,
          split_by_side: splitBySide,
          staff_names_kamite: kamite,
          staff_names_shimote: shimote,
        });
      } catch (updErr) {
        if (String(updErr?.message || '').includes('not found')) {
          return Response.json({ error: 'Position not found', not_found: true }, { status: 404 });
        }
        throw updErr;
      }

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