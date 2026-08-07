// 役割の定義とスタイルマッピング
export const STAFF_ROLES = ["インカム", "バラシ"];

export const ROLE_BADGE_STYLES = {
  "インカム": "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-300",
  "セクションチーフ": "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300",
  "バラシ": "bg-cyan-100 border-cyan-300 text-cyan-700 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-300",
};

export const ROLE_DOT_STYLES = {
  "インカム": "bg-orange-500",
  "セクションチーフ": "bg-purple-500",
  "バラシ": "bg-cyan-500",
};

export const ROLE_ICON_COLORS = {
  "インカム": "text-orange-500",
  "セクションチーフ": "text-purple-500",
  "バラシ": "text-cyan-500",
};

// カスタム役割用カラープリセット（ランダム割り当て用7色）
export const CUSTOM_ROLE_COLOR_PRESETS = [
  { key: "teal", label: "ティール", badge: "bg-teal-100 border-teal-300 text-teal-700 dark:bg-teal-900/40 dark:border-teal-700 dark:text-teal-300", icon: "text-teal-500" },
  { key: "sky", label: "スカイ", badge: "bg-sky-100 border-sky-300 text-sky-700 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-300", icon: "text-sky-500" },
  { key: "green", label: "グリーン", badge: "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300", icon: "text-green-500" },
  { key: "rose", label: "ローズ", badge: "bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-300", icon: "text-rose-500" },
  { key: "yellow", label: "イエロー", badge: "bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-300", icon: "text-yellow-500" },
  { key: "indigo", label: "インディゴ", badge: "bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-300", icon: "text-indigo-500" },
  { key: "fuchsia", label: "フクシア", badge: "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:border-fuchsia-700 dark:text-fuchsia-300", icon: "text-fuchsia-500" },
];

export function getRandomColorKey() {
  return CUSTOM_ROLE_COLOR_PRESETS[Math.floor(Math.random() * CUSTOM_ROLE_COLOR_PRESETS.length)].key;
}

export function getRoleBadgeClass(role, customColorKey) {
  if (ROLE_BADGE_STYLES[role]) return ROLE_BADGE_STYLES[role];
  if (customColorKey) {
    const preset = CUSTOM_ROLE_COLOR_PRESETS.find((p) => p.key === customColorKey);
    if (preset) return preset.badge;
  }
  return "bg-primary/10 border-primary/30 text-primary dark:bg-primary/20 dark:border-primary/50 dark:text-primary";
}

export function getRoleIconColor(role, customColorKey) {
  if (ROLE_ICON_COLORS[role]) return ROLE_ICON_COLORS[role];
  if (customColorKey) {
    const preset = CUSTOM_ROLE_COLOR_PRESETS.find((p) => p.key === customColorKey);
    if (preset) return preset.icon;
  }
  return "text-primary";
}

// 捕まりタグのデフォルトプリセット
export const DEFAULT_CAPTURE_TAGS = ["照明", "道具", "PA", "マイク"];