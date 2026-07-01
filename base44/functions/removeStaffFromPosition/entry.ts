import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { chiefAcastId, staffName, positionId, eventId } = await req.json();

    // 入力検証
    if (!chiefAcastId || !staffName || !positionId || !eventId) {
      return Response.json({ error: '必要なパラメータが不足しています' }, { status: 400 });
    }

    // チーフの存在確認（asServiceRole を使用 - ポータルの未ログインユーザー対応）
    const chiefStaff = await base44.asServiceRole.entities.Staff.filter({ event_id: eventId, acast_id: chiefAcastId }).first();
    if (!chiefStaff) {
      return Response.json({ error: 'チーフが見つかりません' }, { status: 404 });
    }

    // セクションチーフ役割の確認
    if (!chiefStaff.roles?.includes('セクションチーフ')) {
      return Response.json({ error: 'セクションチーフの権限が必要です' }, { status: 403 });
    }

    // 担当ポジションに所属しているか確認（asServiceRole を使用）
    const positions = await base44.asServiceRole.entities.Position.filter({ event_id: eventId });
    const chiefPosition = positions.find((p: any) => {
      const allStaff = [
        ...(p.staff_names || []),
        ...(p.staff_names_kamite || []),
        ...(p.staff_names_shimote || []),
      ];
      return allStaff.includes(chiefStaff.name);
    });

    if (!chiefPosition) {
      return Response.json({ error: '担当ポジションに所属している必要があります' }, { status: 403 });
    }

    // ポジションの取得（asServiceRole を使用）
    const position = await base44.asServiceRole.entities.Position.get(positionId);
    if (!position) {
      return Response.json({ error: 'ポジションが見つかりません' }, { status: 404 });
    }

    // 操作ログ用のスナップショット（削除前）
    const snapshotBefore = {
      staff_names: position.staff_names || [],
      staff_names_kamite: position.staff_names_kamite || [],
      staff_names_shimote: position.staff_names_shimote || [],
    };

    // staff_names, staff_names_kamite, staff_names_shimote からスタッフ名を削除
    const updateData: any = {};
    if (position.staff_names?.includes(staffName)) {
      updateData.staff_names = position.staff_names.filter((name: string) => name !== staffName);
    }
    if (position.staff_names_kamite?.includes(staffName)) {
      updateData.staff_names_kamite = position.staff_names_kamite.filter((name: string) => name !== staffName);
    }
    if (position.staff_names_shimote?.includes(staffName)) {
      updateData.staff_names_shimote = position.staff_names_shimote.filter((name: string) => name !== staffName);
    }

    // 更新が何もない場合はエラー
    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: '指定されたスタッフはこのポジションに所属していません' }, { status: 404 });
    }

    // ポジションを更新（asServiceRole を使用）
    await base44.asServiceRole.entities.Position.update(positionId, updateData);

    // 操作ログを記録（asServiceRole を使用）
    const now = new Date();
    const jstString = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false }).replace(/\//g, '-');
    await base44.asServiceRole.entities.OperationLog.create({
      event_id: eventId,
      action_type: 'position_unassign',
      actor_name: chiefStaff.name,
      actor_email: user.email || '',
      description: `${position.name} から ${staffName} を削除`,
      snapshot_before: snapshotBefore,
      snapshot_after: {
        staff_names: updateData.staff_names || snapshotBefore.staff_names,
        staff_names_kamite: updateData.staff_names_kamite || snapshotBefore.staff_names_kamite,
        staff_names_shimote: updateData.staff_names_shimote || snapshotBefore.staff_names_shimote,
      },
      logged_at_jst: jstString,
      entity_type: 'Position',
      entity_id: positionId,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('removeStaffFromPosition error:', error);
    return Response.json({ error: error.message || '内部エラー' }, { status: 500 });
  }
});