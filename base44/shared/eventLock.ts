/**
 * 時間ベースの編集ロックは廃止されました。
 * アクセス制限は Event.admin_only（管理者専用モード）に一本化されています。
 * これらの関数は互換性のため常に null（ロックなし）を返します。
 */

export async function eventLockResponse(_base44, _eventId, _user) {
  return null;
}

export async function eventLockResponseByPosition(_base44, _positionId, _user) {
  return null;
}