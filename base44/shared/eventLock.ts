/**
 * イベント開催日翌日0:00（JST）以降の編集ロック判定（バックエンドガード用）。
 * admin 以外かつロック条件を満たす場合は 403 を返す。
 */

export function isEventLockedByDate(eventDate) {
  if (!eventDate) return false;
  const ms = Date.parse(eventDate + 'T00:00:00+09:00');
  if (Number.isNaN(ms)) return false;
  return Date.now() >= ms + 86400000;
}

const LOCK_MESSAGE = 'このイベントは終了から1日以上経過しているため編集できません（管理者のみ編集可能）';

/** eventId に基づきロック判定。ロック時は 403 Response、それ以外は null を返す。 */
export async function eventLockResponse(base44, eventId, user) {
  if (!eventId || user?.role === 'admin') return null;
  const event = await base44.asServiceRole.entities.Event.get(eventId).catch(() => null);
  if (!event || !isEventLockedByDate(event.date)) return null;
  return Response.json({ error: LOCK_MESSAGE }, { status: 403 });
}

/** positionId から event_id を解決してロック判定。 */
export async function eventLockResponseByPosition(base44, positionId, user) {
  if (!positionId || user?.role === 'admin') return null;
  const position = await base44.asServiceRole.entities.Position.get(positionId).catch(() => null);
  if (!position) return null;
  return eventLockResponse(base44, position.event_id, user);
}