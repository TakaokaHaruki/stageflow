import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { eventLockResponse, eventLockResponseByPosition } from '../../shared/eventLock.ts';

const unique = (items = []) => [...new Set(items.filter(Boolean))];
const ALLOWED_UPDATE_FIELDS = ['order', 'required_count', 'notes', 'color', 'map_x', 'map_y', 'map_x_kamite', 'map_y_kamite', 'map_x_shimote', 'map_y_shimote', 'category', 'chief_name', 'chief_names', 'parts'];

// ポジションの所属部配列（未設定=1部扱い）
const partsOf = (p) => (Array.isArray(p?.parts) && p.parts.length > 0 ? p.parts : [1]);

// イベントの部間同期設定を取得
const getShowSync = async (base44, eventId) => {
  try {
    const event = (await base44.asServiceRole.entities.Event.filter({ id: eventId }))[0];
    return event?.show_sync || {};
  } catch (_e) {
    return {};
  }
};

// 部間同期ヘルパー: 同期ONの時間帯に作成されるポジションに、同期グループ全員を既定の部として付与する
// （parts未指定で作成された場合のみ。明示的なparts指定は尊重する）
const applySyncPartsTo = (showSync, positions) =>
  positions.map((p) => {
    const group = showSync?.[p.time_slot];
    const hasParts = Array.isArray(p.parts) && p.parts.length > 0;
    if (Array.isArray(group) && group.length >= 2 && !hasParts) {
      return { ...p, parts: [...new Set(group)].sort((a, b) => a - b) };
    }
    return p;
  });

// 部間同期ONの時間帯では、同期グループ内のどの部に同名ポジションが存在していても既存レコードに統合する（重複作成防止）
const createOrMergePosition = async (base44, eventId, showSync, existingPositions, position) => {
  const slot = position.time_slot || '開場中';
  const group = Array.isArray(showSync?.[slot]) ? [...new Set(showSync[slot])].sort((a, b) => a - b) : [];
  const dup = group.length >= 2
    ? existingPositions.find(
        (e) => (e.time_slot || '開場中') === slot && e.name === position.name &&
          partsOf(e).some((pp) => group.includes(pp))
      )
    : undefined;
  if (!dup) {
    const created = await base44.asServiceRole.entities.Position.create({ ...position, event_id: eventId });
    existingPositions.push(created);
    return created;
  }
  const merged = await base44.asServiceRole.entities.Position.update(dup.id, {
    parts: [...new Set([...partsOf(dup), ...partsOf(position)])].sort((a, b) => a - b),
    staff_names: unique([...(dup.staff_names || []), ...(position.staff_names || [])]),
    staff_names_kamite: unique([...(dup.staff_names_kamite || []), ...(position.staff_names_kamite || [])]),
    staff_names_shimote: unique([...(dup.staff_names_shimote || []), ...(position.staff_names_shimote || [])]),
    chief_names: unique([...(dup.chief_names || []), ...(position.chief_names || [])]),
    required_count: Math.max(dup.required_count || 0, position.required_count || 0),
    split_by_side: Boolean(dup.split_by_side) || Boolean(position.split_by_side),
  });
  return { ...(merged || dup), id: dup.id };
};

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
      const lockResp = await eventLockResponse(base44, eventId, user);
      if (lockResp) return lockResp;
      const showSync = await getShowSync(base44, eventId);
      const [positionWithParts] = applySyncPartsTo(showSync, [position]);
      const existingPositions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
      const saved = await createOrMergePosition(base44, eventId, showSync, existingPositions, positionWithParts);
      return Response.json({ position: saved });
    }

    // 新規：複数 Position 並行作成
    if (action === 'createPositions') {
      const { positions } = body;
      if (!Array.isArray(positions) || positions.length === 0) {
        return Response.json({ error: 'positions array is required' }, { status: 400 });
      }
      const lockResp = await eventLockResponse(base44, eventId, user);
      if (lockResp) return lockResp;
      const showSync = await getShowSync(base44, eventId);
      const positionsWithParts = applySyncPartsTo(showSync, positions);
      const existingPositions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
      const saved = [];
      for (const p of positionsWithParts) {
        saved.push(await createOrMergePosition(base44, eventId, showSync, existingPositions, p));
      }
      return Response.json({ positions: saved });
    }

    // 新規：単一 Position 削除
    if (action === 'deletePosition') {
      const { positionId } = body;
      if (!positionId) {
        return Response.json({ error: 'positionId is required' }, { status: 400 });
      }
      const lockResp = await eventLockResponseByPosition(base44, positionId, user);
      if (lockResp) return lockResp;
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
      const lockResp = positionIds[0] ? await eventLockResponseByPosition(base44, positionIds[0], user) : null;
      if (lockResp) return lockResp;
      await Promise.all(positionIds.map((id) => base44.asServiceRole.entities.Position.delete(id)));
      return Response.json({ ok: true });
    }

    // 新規：Position フィールド更新（order, required_count など）
    if (action === 'updatePositionFields') {
      const { positionId, data } = body;
      if (!positionId || !data) {
        return Response.json({ error: 'positionId and data are required' }, { status: 400 });
      }
      const lockResp = await eventLockResponseByPosition(base44, positionId, user);
      if (lockResp) return lockResp;
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

      const lockResp = await eventLockResponse(base44, eventId, user);
      if (lockResp) return lockResp;

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

      const lockResp = await eventLockResponseByPosition(base44, positionId, user);
      if (lockResp) return lockResp;

      const allowedFields = [
        'name', 'time_slot', 'notes', 'color', 'category', 'recommended_gender',
        'map_x', 'map_y', 'map_x_kamite', 'map_y_kamite', 'map_x_shimote', 'map_y_shimote',
        'required_count', 'order', 'chief_name', 'chief_names', 'parts',
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

    // 複数公演モード：部間同期（共有レコード化）／解除（部ごとに分割コピー）
    if (action === 'syncShowParts') {
      const { timeSlot, group, mode: syncMode } = body;
      if (!eventId || !timeSlot || !Array.isArray(group) || group.length === 0) {
        return Response.json({ error: 'eventId, timeSlot, group are required' }, { status: 400 });
      }
      const lockResp = await eventLockResponse(base44, eventId, user);
      if (lockResp) return lockResp;

      const groupKey = [...new Set(group)].sort((a, b) => a - b);
      const allPositions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
      const slotPositions = allPositions.filter((p) => (p.time_slot || '開場中') === timeSlot);
      const partsOf = (p) => (Array.isArray(p.parts) && p.parts.length ? p.parts : [1]);

      if (syncMode === 'sync') {
        const inGroup = slotPositions.filter((p) => partsOf(p).some((pp) => groupKey.includes(pp)));
        const byName = new Map();
        for (const p of inGroup) {
          if (!byName.has(p.name)) byName.set(p.name, []);
          byName.get(p.name).push(p);
        }
        const toUpdate = [];
        const toDelete = [];
        for (const [, arr] of byName) {
          const [keep, ...rest] = arr;
          const staffNames = unique(arr.flatMap((p) => p.staff_names || []));
          const kamite = unique(arr.flatMap((p) => p.staff_names_kamite || []));
          const shimote = unique(arr.flatMap((p) => p.staff_names_shimote || []));
          const chiefNames = unique(arr.flatMap((p) => p.chief_names || []));
          const reqCount = Math.max(0, ...arr.map((p) => p.required_count || 0));
          const splitBySide = arr.some((p) => p.split_by_side);
          toUpdate.push({ id: keep.id, staffNames, kamite, shimote, chiefNames, reqCount, splitBySide });
          toDelete.push(...rest.map((r) => r.id));
        }
        for (const u of toUpdate) {
          await base44.asServiceRole.entities.Position.update(u.id, {
            parts: groupKey,
            staff_names: u.staffNames,
            staff_names_kamite: u.kamite,
            staff_names_shimote: u.shimote,
            chief_names: u.chiefNames,
            required_count: u.reqCount,
            split_by_side: u.splitBySide,
          });
        }
        if (toDelete.length) {
          await Promise.all(toDelete.map((id) => base44.asServiceRole.entities.Position.delete(id)));
        }
        return Response.json({ ok: true, updated: toUpdate.length, deleted: toDelete.length });
      }

      if (syncMode === 'unlink') {
        const shared = slotPositions.filter((p) => {
          const parts = [...partsOf(p)].sort((a, b) => a - b);
          return parts.length === groupKey.length && parts.every((pp, i) => pp === groupKey[i]);
        });
        const toCreate = [];
        for (const p of shared) {
          const [first, ...rest] = groupKey;
          await base44.asServiceRole.entities.Position.update(p.id, { parts: [first] });
          for (const partNum of rest) {
            toCreate.push({
              event_id: eventId,
              name: p.name,
              time_slot: p.time_slot,
              category: p.category || '',
              recommended_gender: p.recommended_gender || '',
              staff_names: p.staff_names || [],
              staff_names_kamite: p.staff_names_kamite || [],
              staff_names_shimote: p.staff_names_shimote || [],
              split_by_side: Boolean(p.split_by_side),
              notes: p.notes || '',
              color: p.color || '',
              map_x: p.map_x ?? null,
              map_y: p.map_y ?? null,
              map_x_kamite: p.map_x_kamite ?? null,
              map_y_kamite: p.map_y_kamite ?? null,
              map_x_shimote: p.map_x_shimote ?? null,
              map_y_shimote: p.map_y_shimote ?? null,
              required_count: p.required_count ?? 0,
              required_skills: p.required_skills || [],
              required_roles: p.required_roles || [],
              chief_name: p.chief_name || '',
              chief_names: p.chief_names || [],
              order: p.order ?? 0,
              parts: [partNum],
            });
          }
        }
        if (toCreate.length) {
          await Promise.all(toCreate.map((c) => base44.asServiceRole.entities.Position.create(c)));
        }
        return Response.json({ ok: true, split: shared.length });
      }

      return Response.json({ error: 'invalid sync mode' }, { status: 400 });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});