import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { jstNow } from "../../shared/eventBackup.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ ok: false, error: 'ログインが必要です' });

    const { device_token, device_info } = await req.json().catch(() => ({}));
    if (!device_token) return Response.json({ ok: false, error: 'トークンが指定されていません' });

    let devices;
    try {
      devices = await base44.asServiceRole.entities.Device.filter({ token: device_token });
    } catch {
      return Response.json({ ok: false, error: '端末情報の確認に失敗しました' });
    }
    if (!devices[0]) return Response.json({ ok: false, error: 'トークンが見つかりません。管理者に再発行をご依頼ください' });
    const d = devices[0];
    if (d.status === 'revoked') return Response.json({ ok: false, error: 'この端末は解除されています。管理者にお問い合わせください' });

    // 個人用端末の場合、認証ユーザーが対象者か確認
    if (d.scope === 'user' && d.target_user_id !== user.id) {
      return Response.json({ ok: false, error: 'この端末は別のユーザーに割り当てられています' });
    }

    await base44.asServiceRole.entities.Device.update(d.id, {
      status: 'active',
      device_info: device_info || '',
      activated_by_name: (user.full_name || user.email || '').toString(),
      activated_at_jst: jstNow(),
    });

    return Response.json({ ok: true, device_token: device_token, label: d.label });
  } catch (error) {
    return Response.json({ ok: false, error: '認証中にエラーが発生しました' }, { status: 500 });
  }
}