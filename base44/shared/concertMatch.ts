// イベント名の正規化・類似判定・クラスタ統合（scrapeConcertInfo 用）
// サイト間の表記揺れ（全角半角・発売方法の接頭辞・ツアー枝番など）を吸収して同一公演をまとめる

export function normalizeTitle(raw) {
  let t = String(raw || '').replace(/<[^>]+>/g, '');
  // NFKC正規化: 全角英数→半角（ｉｉｃｈｉｋｏ→iichiko、ＬｉＳＡ→LiSA、２０２６→2026 など）
  t = t.normalize('NFKC');
  t = t.replace(/[\s\u3000]/g, '');
  // 販売方法などの接頭辞を除去
  t = t.replace(/^(一般発売|先行発売|先着発売|リセール|プレイガイド発売)\/?/, '');
  t = t.replace(/^【[^】]*】\/?/, '');
  // 末尾の「／大分」やリザーブ表記を除去
  t = t.replace(/\/大分$/, '');
  t = t.replace(/(プレ?リザーブ|プリセール|リザーブ)(\d*次)?$/, '');
  // 記号・引用符を除去（『ボクの地球（エルダ）を探して』同士の比較など）
  t = t.replace(/[「」『』“”"'()（）・=＝×~～〜！!？?♪☆★]/g, '');
  return t.toLowerCase();
}

// タイトルから比較用キー群を作る（全体＋引用符内のサブタイトル）
export function titleKeys(raw) {
  const keys = new Set();
  const full = normalizeTitle(raw);
  if (full) keys.add(full);
  const text = String(raw || '');
  for (const m of text.matchAll(/[「『]([^」』]{2,})[」』]/g)) {
    const k = normalizeTitle(m[1]);
    if (k) keys.add(k);
  }
  return keys;
}

export function normalizeVenue(raw) {
  return String(raw || '')
    .normalize('NFKC')
    .replace(/^大分・/, '')
    .replace(/\(大分県\)$/, '')
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}

function isSameTitle(keysA, fullsA, keysB, fullB) {
  // キーの一致（全体一致・引用符内サブタイトル一致）
  for (const k of keysB) {
    if (keysA.has(k)) return true;
  }
  // 片方のタイトルがもう片方に完全に含まれる場合も類似とみなす（3文字以上）
  for (const f of fullsA) {
    if (f.length >= 3 && fullB.indexOf(f) >= 0) return true;
    if (fullB.length >= 3 && f.indexOf(fullB) >= 0) return true;
  }
  return false;
}

// items: [{source, title, date, venue, source_url, priority?}] を
// 「同じ日付＋類似タイトル」ごとにクラスタ化する
export function buildClusters(items) {
  const clusters = [];
  for (const item of items) {
    if (!item.title || !item.date) continue;
    const keys = titleKeys(item.title);
    const full = normalizeTitle(item.title);
    if (keys.size === 0) continue;
    let target = null;
    for (const c of clusters) {
      if (c.date !== item.date) continue;
      if (isSameTitle(c.keys, c.fulls, keys, full)) {
        target = c;
        break;
      }
    }
    if (target) {
      target.items.push(item);
      for (const k of keys) target.keys.add(k);
      target.fulls.push(full);
    } else {
      clusters.push({ date: item.date, keys: new Set(keys), fulls: [full], items: [item] });
    }
  }
  return clusters;
}