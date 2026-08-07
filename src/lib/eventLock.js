export const LOCK_TOOLTIP_TEXT = "開催翌日以降は編集できません（管理者のみ可）";

/**
 * イベント開催日の翌日0:00（JST）を過ぎていればロック判定。
 * date がないイベントはロックしない。
 */
export function isEventLocked(event) {
  if (!event || !event.date) return false;
  const ms = Date.parse(event.date + "T00:00:00+09:00");
  if (Number.isNaN(ms)) return false;
  return Date.now() >= ms + 86400000;
}