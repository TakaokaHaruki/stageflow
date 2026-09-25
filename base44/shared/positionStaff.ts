// ポジションのスタッフ所属判定ヘルパー（複数バックエンド関数で共有）

// 指定スタッフがポジションのいずれかの配列に含まれるか
export function staffInPosition(position, name) {
  const main = position.staff_names || [];
  const kamite = position.staff_names_kamite || [];
  const shimote = position.staff_names_shimote || [];
  return main.includes(name) || kamite.includes(name) || shimote.includes(name);
}

// 指定スタッフの所属サイド（上手/下手/空文字）を返す
export function staffSideInPosition(position, name) {
  const kamite = position.staff_names_kamite || [];
  const shimote = position.staff_names_shimote || [];
  if (kamite.includes(name)) return "上手";
  if (shimote.includes(name)) return "下手";
  return "";
}

// ポジションのチーフ名リストを取得（chief_names 優先、次に chief_name）
export function getChiefNames(position) {
  if (position.chief_names && position.chief_names.length > 0) return position.chief_names;
  return position.chief_name ? [position.chief_name] : [];
}

// 指定スタッフがポジションのチーフか
export function isChiefOfPosition(position, name) {
  return getChiefNames(position).includes(name);
}