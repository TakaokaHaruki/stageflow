// JST時刻文字列の生成・解析（プレゼンス・在席管理用）

export function toJstString(date = new Date()) {
  const jst = new Date(date.getTime() + 9 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${jst.getUTCFullYear()}-${p(jst.getUTCMonth() + 1)}-${p(jst.getUTCDate())} ${p(jst.getUTCHours())}:${p(jst.getUTCMinutes())}:${p(jst.getUTCSeconds())}`;
}

export function parseJst(str) {
  if (!str) return 0;
  const m = String(str).match(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/);
  if (!m) return 0;
  const [, Y, Mo, D, H, Mi, S] = m;
  // JST -> UTC ミリ秒
  return new Date(Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S) - 9 * 3600 * 1000).getTime();
}

// 在席判定の窓
export const ONLINE_WINDOW_MS = 90_000; // ハートビート（20s）の4回消失まで許容
export const ACTIVE_WINDOW_MS = 60_000; // 操作中とみなす窓