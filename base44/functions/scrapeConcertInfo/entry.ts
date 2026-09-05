import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { jstNow } from "../../shared/eventBackup.ts";

const SOURCE_URL = 'https://live-events.a-jp.org/soko/prf/44.html';

function stripTags(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .trim();
}

// 大分県のライブ・コンサート日程ページを解析し、{title, date, venue, source_url} の配列を返す
// 2種類のHTML構造に対応:
//  旧: <dt class="ev_old">9/16(水)</dt><dd><div class="ev_old">タイトル<br>会場（大分県）</div></dd>
//  新: <dt class="el_day"><span class="el_day2">9/16(水)</span></dt><dd><div class="el_ttl">タイトル</div><font>会場（大分県）<br>副題</font></dd>
function parseConcerts(html) {
  const concerts = [];
  const sections = html.split(/<h3[^>]*class="ev_h3"[^>]*>/i);
  for (let i = 1; i < sections.length; i++) {
    const yearMatch = /(\d{4})年/.exec(sections[i].slice(0, 200));
    if (!yearMatch) continue;
    const year = yearMatch[1];
    const dlRegex = /<dl[^>]*>([\s\S]*?)<\/dl>/gi;
    let dlMatch;
    while ((dlMatch = dlRegex.exec(sections[i])) !== null) {
      const dl = dlMatch[1];
      const dtMatch = /<dt[^>]*>([\s\S]*?)<\/dt>/i.exec(dl);
      if (!dtMatch) continue;
      const md = /(\d{1,2})\/(\d{1,2})/.exec(stripTags(dtMatch[1]));
      if (!md) continue;
      let title = '';
      let venue = '';
      const ttlMatch = /<div[^>]*class="el_ttl"[^>]*>([\s\S]*?)<\/div>/i.exec(dl);
      if (ttlMatch) {
        title = stripTags(ttlMatch[1]);
        const fontMatch = /<font[^>]*>([\s\S]*?)<\/font>/i.exec(dl);
        if (fontMatch) {
          const lines = fontMatch[1].split(/<br\s*\/?>/i).map(stripTags).filter(Boolean);
          venue = lines[0] || '';
        }
      } else {
        const ddMatch = /<dd>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/dd>/i.exec(dl);
        if (!ddMatch) continue;
        const parts = ddMatch[1].split(/<br\s*\/?>/i).map(stripTags).filter(Boolean);
        if (parts.length === 0 || !parts[0]) continue;
        title = parts[0];
        venue = parts[1] || '';
      }
      if (!title) continue;
      const hrefMatch = /href="(https:\/\/live-events\.a-jp\.org\/soko\/evg\/\d+\.html)"/i.exec(dl);
      concerts.push({
        title,
        date: `${year}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`,
        venue: venue.replace(/（大分県）$/, '').trim(),
        source_url: hrefMatch ? hrefMatch[1] : '',
      });
    }
  }
  return concerts;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // 手動更新は管理者・定期実行はユーザーなしで呼ばれるため、未ログインは許可する
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) {
      return Response.json({ error: `ページの取得に失敗しました: ${response.status}` }, { status: 400 });
    }
    const html = await response.text();
    const concerts = parseConcerts(html);
    if (concerts.length === 0) {
      return Response.json({ error: 'コンサート情報が見つかりませんでした。ページ構造が変更された可能性があります。' }, { status: 400 });
    }

    // 取得テスト用（DBに書き込まない）
    if (body.dryRun) {
      return Response.json({ ok: true, dry_run: true, fetched: concerts.length, sample: concerts.slice(0, 5) });
    }

    const svc = base44.asServiceRole;
    const existing = await svc.entities.ConcertInfo.list('date', 500);
    const existingMap = new Map(existing.map((c) => [`${c.date}|${c.title}`, c]));
    const fetchedAt = jstNow();
    let created = 0;
    let updated = 0;
    for (const concert of concerts) {
      const ex = existingMap.get(`${concert.date}|${concert.title}`);
      if (!ex) {
        await svc.entities.ConcertInfo.create({ ...concert, last_fetched_at: fetchedAt });
        created++;
      } else if (ex.venue !== concert.venue || ex.source_url !== concert.source_url) {
        await svc.entities.ConcertInfo.update(ex.id, {
          venue: concert.venue,
          source_url: concert.source_url,
          last_fetched_at: fetchedAt,
        });
        updated++;
      }
    }
    return Response.json({ ok: true, fetched: concerts.length, created, updated, fetched_at: fetchedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}