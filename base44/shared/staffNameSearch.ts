// スタッフ名のあいまい検索ヘルパー（バックエンド関数で共有）

// 全角→半角・カタカナ→ひらがな・空白除去・小文字化
export function normalizeName(s) {
  if (!s) return "";
  let r = s.toString();
  // 全角英数字記号→半角
  r = r.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
  // カタカナ→ひらがな
  r = r.replace(/[゠-ヿ]/g, ch => {
    const code = ch.charCodeAt(0);
    if (code >= 0x30A1 && code <= 0x30F6) return String.fromCharCode(code - 0x60);
    return ch;
  });
  // 空白・スペース類を除去
  r = r.replace(/[\s\u3000]+/g, "");
  return r.toLowerCase();
}

// レーベンシュタイン距離
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// あいまい一致判定
// matchType: "exact" | "partial" | "fuzzy" | "none"
// score: 小さいほど近い (0 = 完全一致)
export function fuzzyMatch(query, name) {
  const nq = normalizeName(query);
  const nn = normalizeName(name);
  if (!nq || !nn) return { matched: false, matchType: "none", score: 999 };
  if (nn === nq) return { matched: true, matchType: "exact", score: 0 };
  if (nn.includes(nq) || nq.includes(nn)) {
    return { matched: true, matchType: "partial", score: Math.abs(nn.length - nq.length) + 1 };
  }
  const dist = levenshtein(nq, nn);
  const threshold = Math.max(1, Math.floor(Math.max(nq.length, nn.length) / 3));
  if (dist <= threshold) {
    return { matched: true, matchType: "fuzzy", score: dist + 5 };
  }
  return { matched: false, matchType: "none", score: 999 };
}

// 候補名ランキング（入力補完用）
export function rankCandidates(query, names, limit = 15) {
  const q = (query || "").trim();
  if (!q) return [];
  const ranked = names
    .map(name => ({ name, ...fuzzyMatch(q, name) }))
    .filter(c => c.matched)
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name, "ja"));
  return ranked.slice(0, limit);
}