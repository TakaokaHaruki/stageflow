// ユーザー表示名のヘルパー（full_name → email のフォールバック）
export function getUserDisplayName(user) {
  return user?.full_name || user?.email || "";
}