// ユーザー表示名のヘルパー（display_name → full_name → email のフォールバック）
export function getUserDisplayName(user) {
  return user?.display_name || user?.full_name || user?.email || "";
}