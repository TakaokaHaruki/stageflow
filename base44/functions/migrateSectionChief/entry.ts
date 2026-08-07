import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SECTION_CHIEF_ROLE = 'セクションチーフ';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // 全 Staff レコードを取得（asServiceRole・上限付きで一括取得）
    const allStaff = await base44.asServiceRole.entities.Staff.filter({}, undefined, 5000) || [];
    const targets = allStaff.filter((s) => Array.isArray(s.roles) && s.roles.includes(SECTION_CHIEF_ROLE));

    let updatedCount = 0;
    const errors = [];
    // 並列更新（バッチ）
    await Promise.all(targets.map(async (s) => {
      try {
        const nextRoles = s.roles.filter((r) => r !== SECTION_CHIEF_ROLE);
        await base44.asServiceRole.entities.Staff.update(s.id, { roles: nextRoles });
        updatedCount += 1;
      } catch (e) {
        errors.push({ id: s.id, name: s.name, error: String(e?.message || e) });
      }
    }));

    return Response.json({
      success: true,
      totalStaff: allStaff.length,
      matched: targets.length,
      updated: updatedCount,
      errors,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});