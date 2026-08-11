// 時間ベースのチーフ向け自動ロックは廃止されました。
// アクセス制限は Event.admin_only（管理者専用モード）に一本化されています。
// 互換性のため isEventLocked は常に false を返します。

export const LOCK_TOOLTIP_TEXT = "このイベントは編集できません";

export function isEventLocked() {
  return false;
}