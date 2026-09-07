// 大分県コンサート情報の収集ソース定義（scrapeConcertInfo 用）
// 各 fetch 関数は { source, status: 'ok'|'error', message, items: [{source, title, date, venue, source_url}] } を返す

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ソースごとの優先順位（統合時の代表レコード決定用。小さいほど優先）
export const SOURCE_PRIORITY = { ltike: 1, pia: 2, eplus: 3, kyodo: 4, beanet: 5 };

function decodeEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function stripTags(text) {
  return decodeEntities(String(text || '').replace(/<[^>]+>/g, ' '))
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 文字コード自動判定つきページ取得（Shift_JIS サイト対応）
async function fetchPage(url, extraHeaders) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      ...(extraHeaders || {}),
    },
  });
  if (!res.ok) {
    // エラー時は本文の先頭も添えて、WAF/混雑ページなど原因を判別できるようにする
    const errText = new TextDecoder('utf-8').decode((await res.arrayBuffer()).slice(0, 200)).replace(/\s+/g, ' ');
    throw new Error('HTTP ' + res.status + (errText ? ' (' + errText + ')' : ''));
  }
  const buf = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || '';
  let charset = /charset=([\w-]+)/i.exec(contentType);
  if (charset) {
    charset = charset[1];
  } else {
    const head = new TextDecoder('utf-8').decode(buf.slice(0, 4000));
    charset = /charset=["']?([\w-]+)/i.exec(head) || /encoding=["']?([\w-]+)/i.exec(head);
    charset = charset ? charset[1] : 'utf-8';
  }
  return new TextDecoder(charset).decode(buf);
}

// ─── L-Tike（iichikoグランシアタ検索。1〜2ページ目） ───
const LTIKE_SEARCH_URL = 'https://l-tike.com/search/?vnu=%E3%82%B0%E3%83%A9%E3%83%B3%E3%82%B7%E3%82%A2%E3%82%BF';

// ブラウザの遷移に近いリクエストヘッダー（WAF対策）
const BROWSER_NAV_HEADERS = {
  'Accept-Encoding': 'gzip',
  'Referer': 'https://l-tike.com/',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

export async function fetchLtike() {
  const items = [];
  const seen = new Set();
  let lastError = null;
  // 2ページ目はURLパラメータでは遷移できない構造だが、将来の仕様変更に備えて巡回する（重複は除外）
  for (const url of [LTIKE_SEARCH_URL, LTIKE_SEARCH_URL + '&p=2']) {
    try {
      // WAFによる一時的な拒否（520）に備えて2回まで試行する
      let html = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          html = await fetchPage(url, BROWSER_NAV_HEADERS);
          break;
        } catch (e) {
          lastError = e.message;
          if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      if (!html) continue;
      for (const m of html.matchAll(/<a\s[^>]*data-prfName="([^"]+)"[^>]*>/g)) {
        const tag = m[0];
        const attr = (name) => {
          const r = new RegExp(name + '="([^"]*)"').exec(tag);
          return r ? decodeEntities(r[1]) : '';
        };
        const title = stripTags(attr('data-prfName'));
        const prfDate = attr('data-prfDate');
        if (!title || !/^\d{8}$/.test(prfDate)) continue;
        const key = prfDate + '|' + title;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          source: 'ltike',
          title,
          date: prfDate.slice(0, 4) + '-' + prfDate.slice(4, 6) + '-' + prfDate.slice(6, 8),
          venue: stripTags(attr('data-baseVenueName')),
          source_url: LTIKE_SEARCH_URL,
        });
      }
    } catch (e) {
      lastError = e.message;
    }
  }
  if (items.length === 0) {
    return { source: 'ltike', status: 'error', message: lastError || '公演情報が見つかりませんでした', items: [] };
  }
  return { source: 'ltike', status: 'ok', message: '', items };
}

// ─── チケpia（グランシアタ検索。内部API rlsInfo.do を1〜2ページ目） ───
const PIA_QUERY = 'cAsgnFlg=false&mode=2&bAsgnFlg=false&dispMode=1&rlsIn=0&responsive=true&noConvert=true&kw=%E3%82%B0%E3%83%A9%E3%83%B3%E3%82%B7%E3%82%A2%E3%82%BF&perfIn=0&includeSaleEnd=false&searchMode=1';

function cleanPiaTitle(raw) {
  let t = stripTags(raw);
  t = t.replace(/^(一般発売|先行発売|先着発売|リセール|プレイガイド発売)\s*[／/]?\s*/, '');
  t = t.replace(/^【[^】]*】\s*[／/]?\s*/, '');
  t = t.replace(/\s*[／/]\s*大分\s*$/, '');
  t = t.replace(/(プレ?リザーブ|プリセール|リザーブ)(\d*次)?$/, '');
  t = t.replace(/^「([^」]*)」$/, '$1');
  return t.trim();
}

export async function fetchPia() {
  const items = [];
  let lastError = null;
  for (const page of [1, 2]) {
    try {
      const html = await fetchPage('https://t.pia.jp/pia/rlsInfo.do?' + PIA_QUERY + '&page=' + page);
      for (const block of html.split('<section class="sales_data">').slice(1)) {
        const titleMatch = /<li class="is_title">([\s\S]*?)<\/li>/.exec(block);
        const dateMatch = /<time[^>]*datetime="(\d{4})-(\d{2})-(\d{2})/.exec(block);
        const dateRaw = /<li class="is_date">([\s\S]*?)<\/li>/.exec(block);
        const dateText = stripTags(dateRaw ? dateRaw[1] : '');
        if (!titleMatch || !dateMatch) continue;
        // 日付範囲（複数会場の全国ツアー）は大分公演の日付が特定できないため除外
        if (dateText.indexOf('～') >= 0) continue;
        const title = cleanPiaTitle(titleMatch[1]);
        if (!title) continue;
        const placeMatch = /<li class="is_place"[\s\S]*?<span itemprop="name">([^<]*)<\/span>/.exec(block);
        const hrefMatch = /href="(https:\/\/ticket\.pia\.jp\/pia\/ticketInformation\.do[^"]*)"/.exec(block);
        items.push({
          source: 'pia',
          title,
          date: dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3],
          venue: stripTags(placeMatch ? placeMatch[1] : ''),
          source_url: hrefMatch ? decodeEntities(hrefMatch[1]) : '',
        });
      }
    } catch (e) {
      lastError = e.message;
    }
  }
  if (items.length === 0) {
    return { source: 'pia', status: 'error', message: lastError || '公演情報が見つかりませんでした', items: [] };
  }
  return { source: 'pia', status: 'ok', message: '', items };
}

// ─── e+（iichikoグランシアタの会場ページ。一覧に公演名がないため詳細ページから取得） ───
const EPLUS_VENUE_URL = 'https://eplus.jp/sf/venue/8700010/events';
const EPLUS_VENUE_NAME = 'iichikoグランシアタ';

export async function fetchEplus() {
  try {
    const html = await fetchPage(EPLUS_VENUE_URL);
    const items = [];
    const seen = new Set();
    for (const m of html.matchAll(/<a class="ticket-item[^"]*"[^>]*href="(https:\/\/eplus\.jp\/sf\/detail\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const compact = m[2].replace(/\s+/g, '');
      const dm = /ticket-item__yyyy">(\d{4})\/<\/span><span class="ticket-item__mmdd">(\d{1,2})\/(\d{1,2})\(/.exec(compact);
      if (!dm) continue;
      const date = dm[1] + '-' + dm[2].padStart(2, '0') + '-' + dm[3].padStart(2, '0');
      const key = date + '|' + m[1];
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ source: 'eplus', title: '', date, venue: EPLUS_VENUE_NAME, source_url: m[1] });
    }
    if (items.length === 0) {
      return { source: 'eplus', status: 'error', message: '公演情報が見つかりませんでした', items: [] };
    }
    // 一覧には公演名が含まれないため、詳細ページから公演名を取得する
    let titled = 0;
    for (const item of items.slice(0, 40)) {
      try {
        const detail = await fetchPage(item.source_url);
        const titleMatch =
          /property="og:title"\s+content="([^"]+)"/.exec(detail) ||
          /content="([^"]+)"\s+property="og:title"/.exec(detail) ||
          /<title>([^<]+)<\/title>/.exec(detail);
        if (titleMatch) {
          const t = stripTags(titleMatch[1]).split(/[｜|]/)[0].trim();
          if (t) {
            item.title = t;
            titled++;
          }
        }
      } catch (e) {
        // 個別詳細ページの取得失敗は無視（公演名なしのアイテムは登録しない）
      }
    }
    const withTitle = items.filter((i) => i.title);
    const message = '公演名取得' + titled + '件／全' + items.length + '件';
    return { source: 'eplus', status: 'ok', message, items: withTitle };
  } catch (e) {
    return { source: 'eplus', status: 'error', message: e.message, items: [] };
  }
}

// ─── 京楽西日本（大分エリア検索。Shift_JIS） ───
const KYODO_URL = 'https://www.kyodo-west.co.jp/artist_search.php?by=area&area_key=%91%E5%95%AA';

export async function fetchKyodo() {
  try {
    const html = await fetchPage(KYODO_URL);
    const items = [];
    for (const block of html.split('<!-- 公演 -->').slice(1)) {
      const end = block.indexOf('<!-- 公演　ここまで -->');
      const b = end >= 0 ? block.slice(0, end) : block.slice(0, 3000);
      const dtRaw = /<dt[^>]*>([\s\S]*?)<\/dt>/.exec(b);
      const dm = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(stripTags(dtRaw ? dtRaw[1] : ''));
      const titleRaw = /<span class="title">([\s\S]*?)<\/span>/.exec(b);
      const title = stripTags(titleRaw ? titleRaw[1] : '');
      if (!dm || !title) continue;
      const placeRaw = /<span class="place">([\s\S]*?)<\/span>/.exec(b);
      const hrefMatch = /href="(artist_page\.php\?a_id=\d+)"/.exec(b);
      items.push({
        source: 'kyodo',
        title,
        date: dm[1] + '-' + dm[2].padStart(2, '0') + '-' + dm[3].padStart(2, '0'),
        venue: stripTags(placeRaw ? placeRaw[1] : '').replace(/^大分・/, ''),
        source_url: hrefMatch ? 'https://www.kyodo-west.co.jp/' + hrefMatch[1] : '',
      });
    }
    if (items.length === 0) {
      const blocks = html.split('<!-- 公演 -->').length - 1;
      return {
        source: 'kyodo',
        status: 'error',
        message:
          '公演情報が見つかりませんでした (len=' + html.length + ', blocks=' + blocks + ', head=' + html.slice(0, 150).replace(/\s+/g, ' ') + ')',
        items: [],
      };
    }
    return { source: 'kyodo', status: 'ok', message: '', items };
  } catch (e) {
    return { source: 'kyodo', status: 'error', message: e.message, items: [] };
  }
}

// ─── bea-net（九州ライブ情報。公演データをJSON配信） ───
const BEANET_JSON_URL = 'https://bea-net.com/js/artist.json';

export async function fetchBeanet() {
  try {
    const res = await fetch(BEANET_JSON_URL, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const artists = await res.json();
    const items = [];
    for (const artist of Array.isArray(artists) ? artists : []) {
      const title = stripTags(artist.art);
      if (!title) continue;
      // liveinfo は配列の場合と {"0": {...}} 形式のオブジェクトの場合がある
      const lives = Array.isArray(artist.liveinfo)
        ? artist.liveinfo
        : artist.liveinfo && typeof artist.liveinfo === 'object'
          ? Object.values(artist.liveinfo)
          : [];
      for (const live of lives) {
        // 大分県の公演のみ抽出
        if (live.pp !== '大分') continue;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(live.date || '')) continue;
        items.push({
          source: 'beanet',
          title,
          date: live.date,
          venue: stripTags(live.place || ''),
          source_url: artist.pid ? 'https://bea-net.com/liveinformation/artist/' + artist.pid + '.html' : '',
        });
      }
    }
    if (items.length === 0) {
      return { source: 'beanet', status: 'error', message: '大分県の公演情報が見つかりませんでした', items: [] };
    }
    return { source: 'beanet', status: 'ok', message: '', items };
  } catch (e) {
    return { source: 'beanet', status: 'error', message: e.message, items: [] };
  }
}