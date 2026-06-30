// 役割の定義とスタイルマッピング
export const STAFF_ROLES = ["インカム", "セクションチーフ"];

export const ROLE_BADGE_STYLES = {
  "インカム": "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-300",
  "セクションチーフ": "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300",
};

export const ROLE_DOT_STYLES = {
  "インカム": "bg-orange-500",
  "セクションチーフ": "bg-purple-500",
};

export function getRoleBadgeClass(role) {
  return ROLE_BADGE_STYLES[role] || "bg-primary/10 border-primary/30 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-primary";
}

// 捕まりタグのデフォルトプリセット
export const DEFAULT_CAPTURE_TAGS = ["照明", "道具", "PA", "マイク"];