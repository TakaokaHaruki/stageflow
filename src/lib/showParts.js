// 複数公演モード（部）のヘルパー

// ポジションの所属部配列を取得（未設定=1部扱い）
export function getParts(pos) {
  if (!pos) return [1];
  const parts = pos.parts;
  return Array.isArray(parts) && parts.length > 0 ? parts : [1];
}

// 選択中部に表示対象か
export function isInPart(pos, part) {
  return getParts(pos).includes(part);
}

// 部ラベル（例: "1部"、"1・2部"）
export function partLabel(parts) {
  const arr = Array.isArray(parts) && parts.length > 0 ? parts : [1];
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted.map((p) => `${p}部`).join("・");
}

// 同期グループのキー（ソート済み数値配列）
export function syncGroupKey(group) {
  return [...group].sort((a, b) => a - b).join(",");
}