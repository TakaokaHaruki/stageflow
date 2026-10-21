import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  pbkdf2Hash,
  verifyPin,
  makeSessionToken,
  randomSaltHex,
  jstNowStr,
  jstPlusMinutes,
} from '../../shared/portalAuth.ts';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/**
 * ポータルのチーフPIN認証をサーバー側で行う。
 * action: status=PIN設定済みか確認 / setup=PIN設定 / verify=PIN照合（トークン発行） / reset_request=リセット申請
 * pin_hashはクライアントに返さない。照合は全てサーバー側で行い、失敗はサーバー側でカウント・ロックする。
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const acastId = String(body.acast_id || '').trim();
    if (!acastId) {
      return Response.json({ error: 'acast_id は必須です' }, { status: 400 });
    }
    const svc = base44.asServiceRole;
    const findPin = async () => (await svc.entities.PinCode.filter({ acast_id: acastId }))[0] || null;

    if (action === 'status') {
      const rec = await findPin();
      const now = jstNowStr();
      const locked = !!(rec?.locked_until_jst && rec.locked_until_jst > now);
      return Response.json({ has_pin: !!(rec && rec.pin_hash), locked });
    }

    if (action === 'setup') {
      const pin = String(body.pin || '');
      if (!/^\d{4}$/.test(pin)) {
        return Response.json({ error: 'PINは4桁の数字で入力してください' });
      }
      const staff = await svc.entities.Staff.filter({ acast_id: acastId });
      if (!staff || staff.length === 0) {
        return Response.json({ error: 'スタッフ情報が見つかりません' });
      }
      const rec = await findPin();
      if (rec && rec.pin_hash) {
        return Response.json({ error: 'すでにPINが設定されています。管理者にリセットを申請してください' });
      }
      const saltHex = randomSaltHex();
      const hash = 'pbkdf2$120000$' + saltHex + '$' + (await pbkdf2Hash(pin, saltHex));
      const data = {
        pin_hash: hash,
        failed_attempts: 0,
        locked_until_jst: '',
        reset_requested: false,
        reset_requested_at_jst: '',
        created_at_jst: jstNowStr(),
      };
      if (rec) {
        await svc.entities.PinCode.update(rec.id, data);
      } else {
        await svc.entities.PinCode.create({ acast_id: acastId, ...data });
      }
      const token = await makeSessionToken(acastId);
      return Response.json({ ok: true, token });
    }

    if (action === 'verify') {
      const pin = String(body.pin || '');
      if (!/^\d{4}$/.test(pin)) {
        return Response.json({ error: '4桁のPINを入力してください' });
      }
      const rec = await findPin();
      if (!rec || !rec.pin_hash) {
        return Response.json({ setup: true });
      }
      const now = jstNowStr();
      if (rec.locked_until_jst && rec.locked_until_jst > now) {
        return Response.json({ ok: false, locked: true, error: '試行回数が上限に達しました。15分後に再度お試しください' });
      }
      const result = await verifyPin(pin, rec.pin_hash);
      if (!result.ok) {
        const attempts = (rec.failed_attempts || 0) + 1;
        const upd = { failed_attempts: attempts };
        if (attempts >= MAX_ATTEMPTS) upd.locked_until_jst = jstPlusMinutes(LOCK_MINUTES);
        try { await svc.entities.PinCode.update(rec.id, upd); } catch (e) {}
        return Response.json({ ok: false, attempts, error: 'PINが正しくありません' });
      }
      const upd = { failed_attempts: 0, locked_until_jst: '' };
      if (result.upgradedHash) upd.pin_hash = result.upgradedHash;
      try { await svc.entities.PinCode.update(rec.id, upd); } catch (e) {}
      const token = await makeSessionToken(acastId);
      return Response.json({ ok: true, token });
    }

    if (action === 'reset_request') {
      const rec = await findPin();
      if (rec) {
        await svc.entities.PinCode.update(rec.id, {
          reset_requested: true,
          reset_requested_at_jst: jstNowStr(),
        });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: '不正なactionです' }, { status: 400 });
  } catch (error) {
    console.error('portalPinAuth error:', error);
    return Response.json({ error: '処理中にエラーが発生しました' }, { status: 500 });
  }
}