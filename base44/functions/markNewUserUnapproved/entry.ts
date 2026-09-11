import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// 承認制を導入した日時（これ以降に新規登録したアカウントが対象）
const APPROVAL_SINCE = new Date('2026-09-11T00:00:00Z');

/**
 * 新規登録ユーザーを未承認ステータスにする関数。
 * 対象: 承認制導入以降に作成された、デフォルト権限(user)のアカウント。
 * すでに承認済みの承認申請を持つユーザーは対象外（承認後の再ログインで巻き戻らないように）。
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'user' || new Date(user.created_date) <= APPROVAL_SINCE) {
      return Response.json({ changed: false });
    }

    // 承認済みの承認申請がある場合は既に承認されたユーザーなので対象外
    const approvedRequests = await base44.entities.ApprovalRequest.filter(
      { user_id: user.id, status: 'approved' },
      '-created_date',
      1
    );
    if (approvedRequests && approvedRequests.length > 0) {
      return Response.json({ changed: false });
    }

    // 自身のロール変更はユーザー権限では不可のためサービスロールで更新
    await base44.asServiceRole.entities.User.update(user.id, { role: 'unapproved' });
    return Response.json({ changed: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}