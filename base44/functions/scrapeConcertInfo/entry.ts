import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { jstNow } from "../../shared/eventBackup.ts";
import { fetchLtike, fetchPia, fetchEplus, fetchKyodo, fetchBeanet, SOURCE_PRIORITY } from "../../shared/concertSources.ts";
import { buildClusters, normalizeVenue } from "../../shared/concertMatch.ts";

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

    // 5ソース（L-Tike / チケpia / e+ / 京楽西日本 / bea-net）を並列取得
    const results = await Promise.all(
      [fetchLtike(), fetchPia(), fetchEplus(), fetchKyodo(), fetchBeanet()].map((p) =>
        p.catch((e) => ({ source: 'unknown', status: 'error', message: e.message, items: [] }))
      )
    );
    const sourceReports = {};
    const fetched = [];
    for (const r of results) {
      sourceReports[r.source] = { status: r.status, count: r.items.length, message: r.message || '' };
      for (const item of r.items) {
        fetched.push({ ...item, priority: SOURCE_PRIORITY[item.source] || 9 });
      }
    }
    if (fetched.length === 0) {
      return Response.json({ error: 'いずれのソースからも公演情報を取得できませんでした', sources: sourceReports }, { status: 400 });
    }

    // dryRun: DBに書き込まず、ソース別の抽出結果と統合プレビューを返す
    if (body.dryRun) {
      const clusters = buildClusters(fetched.slice().sort((a, b) => a.priority - b.priority));
      return Response.json({
        ok: true,
        dry_run: true,
        fetched: fetched.length,
        sources: sourceReports,
        merge_preview: clusters.map((c) => ({
          title: c.items[0].title,
          date: c.date,
          venue: c.items[0].venue,
          sources: c.items.map((i) => i.source),
          merged_from: c.items.length,
        })),
      });
    }

    const svc = base44.asServiceRole;
    const existing = await svc.entities.ConcertInfo.list('date', 500);
    // 取得データは優先順位順、既存レコードは最優先度低（既存の重複も再統合する）
    const items = fetched
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .concat(
        existing.map((c) => ({
          source: 'existing',
          priority: 99,
          title: c.title || '',
          date: c.date,
          venue: c.venue || '',
          source_url: c.source_url || '',
          id: c.id,
        }))
      );
    const clusters = buildClusters(items);

    const fetchedAt = jstNow();
    let created = 0;
    let updated = 0;
    let merged = 0;
    for (const c of clusters) {
      // 代表: チケットサイト（L-Tike > PIA > e+ > その他）の情報を優先
      const rep = c.items.reduce((a, b) => (b.priority < a.priority ? b : a));
      const existingInCluster = c.items.filter((i) => i.id);
      const keep = existingInCluster[0] || null;

      if (keep) {
        const updates = {};
        if (rep.priority < 99) {
          if (rep.title && rep.title !== keep.title) updates.title = rep.title;
          const venue = normalizeVenue(rep.venue);
          if (venue && venue !== (keep.venue || '')) updates.venue = venue;
          if (rep.source_url && rep.source_url !== (keep.source_url || '')) updates.source_url = rep.source_url;
          updates.last_fetched_at = fetchedAt;
        }
        if (Object.keys(updates).length > 0) {
          await svc.entities.ConcertInfo.update(keep.id, updates);
          updated++;
        }
        // クラスタ内の重複した既存レコードは1つにまとめる
        for (const dup of existingInCluster.slice(1)) {
          await svc.entities.ConcertInfo.delete(dup.id);
          merged++;
        }
      } else {
        // 新規公演のみ作成（既存のみのクラスタは作成しない）
        if (rep.priority < 99) {
          await svc.entities.ConcertInfo.create({
            title: rep.title,
            date: c.date,
            venue: normalizeVenue(rep.venue),
            source_url: rep.source_url || '',
            last_fetched_at: fetchedAt,
          });
          created++;
        }
      }
    }
    return Response.json({ ok: true, fetched: fetched.length, created, updated, merged, sources: sourceReports, fetched_at: fetchedAt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}