export function getPublicStaffName(name) {
  const text = String(name || "").trim();
  if (!text) return "";
  return text.split(/[\s\u3000]+/)[0] || text;
}

export function getStaffDisplayName(name, shouldMask = false) {
  return shouldMask ? getPublicStaffName(name) : String(name || "");
}

const GENDER_COLORS = { "男": "#2563eb", "女": "#dc2626" };

// スタッフの表示色。明示的に color が設定されていればそれを、未設定なら性別に応じた既定色を返す。
export function getStaffColor(staff) {
  if (!staff) return undefined;
  if (staff.color) return staff.color;
  return GENDER_COLORS[staff.gender] || undefined;
}