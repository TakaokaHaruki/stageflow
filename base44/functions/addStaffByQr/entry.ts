import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const unique = (items = []) => [...new Set(items.filter(Boolean))];

function getJstNow() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60000);
  return `${jst.toISOString().slice(0, 10)} ${jst.toISOString().slice(11, 16)}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { chiefAcastId, targetAcastId, positionId, eventId } = body;

    if (!chiefAcastId || !targetAcastId || !positionId || !eventId) {
      return Response.json({ error: 'chiefAcastId, targetAcastId, positionId, eventId は必須です' }, { status: 400 });
    }

    // チーフ情報を取得
    const chiefStaffList = await base44.asServiceRole.entities.Staff.filter({
      acast_id: chiefAcastId,
      event_id: eventId,
    });
    if (!chiefStaffList || chiefStaffList.length === 0) {
      return Response.json({ error: 'チーフ情報が見つかりません' }, { status: 404 });
    }
    const chief = chiefStaffList[0];

    // ポジションを取得してチーフ権限を確認（chief_name ベース）
    let position;
    try {
      position = await base44.asServiceRole.entities.Position.get(positionId);
    } catch {
      return Response.json({ error: 'ポジションが見つかりません' }, { status: 404 });
    }
    if (!position || position.event_id !== eventId) {
      return Response.json({ error: 'ポジションが見つかりません' }, { status: 404 });
    }

    // チーフ権限を確認（同一イベント内のいずれかのポジションの chief_names に含まれること）
    const eventAllPositions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
    const isChiefInEvent = (eventAllPositions || []).some((p) => {
      const chiefs = (p.chief_names && p.chief_names.length > 0)
        ? p.chief_names
        : (p.chief_name ? [p.chief_name] : []);
      return chiefs.includes(chief.name);
    });
    if (!isChiefInEvent) {
      return Response.json({ error: 'このイベントの担当チーフではありません' }, { status: 403 });
    }

    // 対象スタッフを取得
    const targetStaffList = await base44.asServiceRole.entities.Staff.filter({
      acast_id: targetAcastId,
      event_id: eventId,
    });
    if (!targetStaffList || targetStaffList.length === 0) {
      return Response.json({ error: '対象スタッフが見つかりません。A-CAST ID を確認してください。' }, { status: 404 });
    }
    const target = targetStaffList[0];

    // 対象ポジションの現在状態
    const currentNames = position.staff_names || [];
    const currentKamite = position.staff_names_kamite || [];
    const currentShimote = position.staff_names_shimote || [];
    const splitBySide = Boolean(position.split_by_side);

    const inTarget = splitBySide
      ? (currentKamite.includes(target.name) || currentShimote.includes(target.name))
      : currentNames.includes(target.name);

    // 同一イベント内の他ポジションに既に配置されているか検索（移動対象）
    const otherPositions = (eventAllPositions || []).filter((p) => p.id !== positionId);
    const removeFrom = otherPositions.filter((p) => {
      const inMain = (p.staff_names || []).includes(target.name);
      const inKamite = (p.staff_names_kamite || []).includes(target.name);
      const inShimote = (p.staff_names_shimote || []).includes(target.name);
      return inMain || inKamite || inShimote;
    });

    // 既に読み取りポジションに配置済み ＆ 他ポジションにも属していない → 操作不要
    if (inTarget && removeFrom.length === 0) {
      return Response.json({ error: `${target.name}さんは既にこのポジションに配置済みです`, alreadyAssigned: true }, { status: 409 });
    }

    const loggedAt = getJstNow();

    // 他ポジションから削除（移動元）
    for (const p of removeFrom) {
      const pNames = (p.staff_names || []).filter((n) => n !== target.name);
      const pKamite = (p.staff_names_kamite || []).filter((n) => n !== target.name);
      const pShimote = (p.staff_names_shimote || []).filter((n) => n !== target.name);
      await base44.asServiceRole.entities.Position.update(p.id, {
        staff_names: pNames,
        staff_names_kamite: pKamite,
        staff_names_shimote: pShimote,
      });
    }

    // 読み取りポジションに追加（既にいる場合はスキップ）
    let updateData;
    if (!inTarget) {
      if (splitBySide) {
        // split_by_side の場合は上手（デフォルト）に追加
        const nextKamite = [...currentKamite, target.name];
        const nextShimote = currentShimote;
        const nextStaffNames = unique([...nextKamite, ...nextShimote]);
        updateData = {
          staff_names: nextStaffNames,
          staff_names_kamite: nextKamite,
          staff_names_shimote: nextShimote,
          added_by: chief.name,
          added_at_jst: loggedAt,
        };
      } else {
        const nextStaffNames = [...currentNames, target.name];
        updateData = {
          staff_names: nextStaffNames,
          added_by: chief.name,
          added_at_jst: loggedAt,
        };
      }
      await base44.asServiceRole.entities.Position.update(positionId, updateData);
    }

    const movedFromNames = removeFrom.map((p) => p.name);

    // 操作ログを記録
    try {
      await base44.asServiceRole.entities.OperationLog.create({
        event_id: eventId,
        action_type: 'position_assign',
        actor_name: chief.name,
        description: movedFromNames.length > 0
          ? `「${target.name}」を「${movedFromNames.join('、')}」から「${position.name}」に移動しました（QR読取 by ${chief.name}）`
          : `「${target.name}」を「${position.name}」に追加しました（QR読取 by ${chief.name}）`,
        entity_type: 'Position',
        entity_id: positionId,
        logged_at_jst: loggedAt,
        snapshot_before: {
          staff_names: currentNames,
          staff_names_kamite: currentKamite,
          staff_names_shimote: currentShimote,
          split_by_side: splitBySide,
          moved_from: movedFromNames,
        },
        snapshot_after: updateData || {},
      });
    } catch (logErr) {
      console.error('OperationLog save failed (non-critical)', logErr);
    }

    return Response.json({
      success: true,
      staffName: target.name,
      positionName: position.name,
      addedBy: chief.name,
      addedAt: loggedAt,
      moved: movedFromNames.length > 0,
      movedFrom: movedFromNames,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});