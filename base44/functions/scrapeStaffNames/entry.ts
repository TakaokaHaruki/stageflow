import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ブラウザーに近いリクエストヘッダー（A-CAST側の自動取得ブロックを避けるため）
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

const MESSAGES: Record<string, string> = {
  blocked: 'A-CASTがページの取得を拒否しました（アクセス拒否）。ブラウザーでは表示できても、アプリからの自動取得はブロックされることがあります。時間をおいて再試行するか、お手数ですがスタッフを手動で登録してください。',
  not_found: '点呼表が見つかりませんでした（ページが存在しません）。URLの有効期限が切れている可能性があります。A-CASTで最新の点呼URLを再取得してください。',
  rate_limited: 'A-CAST側のアクセス制限（回数制限）に達しました。数分おいてから再試行してください。',
  server_error: 'A-CAST側で一時的なエラーが発生しています。時間をおいて再試行してください。',
  network: 'A-CASTのページに接続できませんでした。ブラウザーでは表示できても、アプリのサーバーからのアクセスは遮断される場合があります。管理者の方は、A-CASTの点呼表をCSVで保存し、スタッフ管理の「CSV登録」から一括登録してください。',
  unreachable: 'A-CASTがアプリのサーバーからのアクセスを遮断しています（ブラウザーでは表示できても、自動取得は拒否されます）。管理者の方は、A-CASTの点呼表をCSVで保存し、スタッフ管理の「CSV登録」から一括登録してください。',
  login_page: '点呼表ではなくログイン画面が返されました。A-CASTにログインした状態で発行した共有用の点呼URLか確認してください。',
  empty_page: 'ページの中身が取得できませんでした（応答が空、またはJavaScriptで描画されるページです）。A-CASTで点呼表が表示されるURLか確認してください。',
  layout_changed: '点呼表の形式が変更された可能性があります（スタッフの行を検出できませんでした）。URLを確認のうえ、表示されている詳細情報を添えてご連絡ください。',
};

function fail(key: string, detail?: Record<string, unknown>, status = 400) {
  return Response.json({ error: MESSAGES[key], reason: key, detail: detail || null }, { status });
}

// ページの文字コード（Shift_JIS など）を判定してデコードする
function decodeBody(buffer: Uint8Array, contentType: string) {
  const fromHeader = /charset=["']?([^;"'\s]+)/i.exec(contentType)?.[1]?.trim().toLowerCase() || '';
  let charset = fromHeader;
  if (!charset) {
    const peek = new TextDecoder('utf-8').decode(buffer.slice(0, 4096));
    charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(peek)?.[1]?.toLowerCase() || '';
  }
  try {
    return { html: new TextDecoder(charset || 'utf-8').decode(buffer), charset: charset || 'utf-8' };
  } catch {
    return { html: new TextDecoder('utf-8').decode(buffer), charset: 'utf-8(fallback)' };
  }
}

function statusReason(status: number) {
  // 52x/530 はA-CAST側（Cloudflare等）がアプリのサーバーからのアクセスを遮断している状態
  if (status >= 520 && status <= 530) return 'unreachable';
  if (status === 401 || status === 403) return 'blocked';
  if (status === 404 || status === 410) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server_error';
  return 'blocked';
}

function fetchPage(url: string) {
  return fetch(url, { headers: BROWSER_HEADERS, redirect: 'follow' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'chief'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { url, eventId, selectedNames, selectedStaff } = await req.json();
    if (!url || !eventId) {
      return Response.json({ error: 'urlとeventIdは必須です' }, { status: 400 });
    }

    // SSRF対策: 取得先はA-CAST点呼表の正規ドメイン（https）に限定する
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch {
      return Response.json({ error: 'URLの形式が正しくありません' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      return Response.json({ error: 'httpsのA-CAST点呼表URLを指定してください' }, { status: 400 });
    }
    const requestHost = parsedUrl.hostname;
    if (requestHost !== 'a-cast.co.jp' && !requestHost.endsWith('.a-cast.co.jp')) {
      return Response.json({ error: 'A-CASTの点呼表URLのみ指定できます' }, { status: 400 });
    }

    // 保存フェーズ（すでに取得済みのスタッフ名を保存するだけ）はページ取得を行わない
    if ((selectedStaff && Array.isArray(selectedStaff)) || (selectedNames && Array.isArray(selectedNames))) {
      const staffToSave = selectedStaff || (selectedNames || []).map((name: string) => ({ name, acast_id: null }));
      const existingStaff = await base44.asServiceRole.entities.Staff.filter({ event_id: eventId });
      const existingNames = new Set(existingStaff.map((s: { name: string }) => s.name));
      const addedStaff: string[] = [];
      for (const staff of staffToSave) {
        if (!existingNames.has(staff.name)) {
          await base44.asServiceRole.entities.Staff.create({
            event_id: eventId,
            name: staff.name,
            acast_id: staff.acast_id || null,
            gender: staff.gender || "",
            color: staff.color || ""
          });
          addedStaff.push(staff.name);
        } else {
          const existing = existingStaff.find((s: { name: string }) => s.name === staff.name);
          if (existing) {
            const updates: Record<string, string> = {};
            if (staff.acast_id && !existing.acast_id) updates.acast_id = staff.acast_id;
            if (staff.gender && !existing.gender) updates.gender = staff.gender;
            if (staff.color && !existing.color) updates.color = staff.color;
            if (Object.keys(updates).length > 0) {
              await base44.asServiceRole.entities.Staff.update(existing.id, updates);
            }
          }
        }
      }
      return Response.json({
        found: staffToSave.length,
        added: addedStaff.length,
        skipped: staffToSave.length - addedStaff.length,
        names: addedStaff,
      });
    }

    // 取得フェーズ: 応答を診断しながらページを取得
    let response: Response;
    try {
      response = await fetchPage(url);
    } catch (e) {
      console.error('scrapeStaffNames fetch error:', e);
      return fail('network', { status: 0, requestedUrl: url });
    }

    const contentType = response.headers.get('content-type') || '';
    const detail = {
      status: response.status,
      finalUrl: response.url,
      contentType,
      charset: '',
      htmlLength: 0,
      hasStaffTable: false,
    };

    // リダイレクトでログイン画面など別ページに誘導された場合も検知する
    const finalPath = (() => { try { return new URL(response.url).pathname; } catch { return ''; } })();
    if (/login|signin|auth/i.test(finalPath) && response.ok) {
      return fail('login_page', { ...detail });
    }

    if (!response.ok) {
      return fail(statusReason(response.status), { ...detail });
    }

    const buffer = new Uint8Array(await response.arrayBuffer());
    const { html, charset } = decodeBody(buffer, contentType);
    detail.charset = charset;
    detail.htmlLength = html.length;

    // A-CASTの点呼URLが有効期限切れ・無効の場合の検知
    if (html.includes('点呼が存在しません') || html.includes('URLをご確認ください')) {
      return Response.json({ error: '点呼表のURLが有効期限切れ、または無効です。A-CASTで最新の点呼URLを再取得してください。', reason: 'invalid_token', detail });
    }

    if (html.length < 200) {
      return fail('empty_page', { ...detail });
    }
    if (/type=["']password["']/i.test(html) || html.includes('ログインしてください')) {
      return fail('login_page', { ...detail });
    }

    // スタッフ行を解析
    const staffList: Record<string, unknown>[] = [];
    let exists = false;
    const rowRegex = /<tr[^>]*class="TDBox"[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      exists = true;
      const rowHtml = rowMatch[1];
      const nameMatch = /<span[^>]*class="[^"]*onamae[^"]*"[^>]*>\s*<span[^>]*class="[^"]*search[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(rowHtml);
      if (!nameMatch) continue;
      const name = nameMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
      if (!name || name === '(氏名なし)') continue;

      const idMatch = /<span[^>]*class="[^"]*staffId[^"]*"[^>]*>\s*<span[^>]*class="[^"]*search[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(rowHtml);
      const acast_id = idMatch ? idMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : '';

      const typeMatch = /<span[^>]*class="[^"]*type[^"]*"[^>]*>\s*<span[^>]*class="[^"]*search[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(rowHtml);
      const type = typeMatch ? typeMatch[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
      const memoMatch = /class="memo_i"[^>]*value="([^"]*)"/i.exec(rowHtml);
      const memo = memoMatch ? memoMatch[1].trim() : '';
      const defaultChecked = !type.includes('物販') && memo !== '帰宅';

      staffList.push({ name, acast_id, type, memo, defaultChecked });
    }
    detail.hasStaffTable = exists;

    // 過去イベントで性別が設定されているスタッフがいれば、acast_id で突合して自動反映
    const acastIds = staffList.map((s) => s.acast_id).filter((id) => id);
    if (acastIds.length > 0) {
      try {
        const pastStaff = await base44.asServiceRole.entities.Staff.filter({ acast_id: { $in: acastIds }, gender: { $ne: "" } });
        const genderByAcast: Record<string, string> = {};
        for (const ps of pastStaff) {
          if (ps.acast_id && ps.gender && !genderByAcast[ps.acast_id]) {
            genderByAcast[ps.acast_id] = ps.gender;
          }
        }
        for (const s of staffList) {
          if (s.acast_id && genderByAcast[s.acast_id as string]) {
            s.gender = genderByAcast[s.acast_id as string];
          }
        }
      } catch (e) {
        // 過去スタッフの突合に失敗しても取得自体は継続
      }
    }

    // 「?」入り氏名（文字化け）の候補補完：過去スタッフ履歴から推測
    const garbledNames = staffList.filter((s) => (s.name as string).includes('?') || (s.name as string).includes('？'));
    if (garbledNames.length > 0) {
      try {
        const allPast = await base44.asServiceRole.entities.Staff.list('-created_date', 5000);
        const cleanByAcast: Record<string, string[]> = {};
        const allCleanNames = new Set<string>();
        for (const ps of allPast) {
          if (!ps.name) continue;
          if (ps.name.includes('?') || ps.name.includes('？')) continue;
          allCleanNames.add(ps.name);
          if (ps.acast_id) {
            if (!cleanByAcast[ps.acast_id]) cleanByAcast[ps.acast_id] = [];
            if (!cleanByAcast[ps.acast_id].includes(ps.name)) cleanByAcast[ps.acast_id].push(ps.name);
          }
        }
        const cleanNameArr = Array.from(allCleanNames);
        for (const s of garbledNames) {
          const candidates = new Set<string>();
          const aid = s.acast_id as string;
          if (aid && cleanByAcast[aid]) {
            cleanByAcast[aid].forEach((n) => candidates.add(n));
          }
          const stripped = (s.name as string).replace(/[?？]/g, '').trim();
          if (stripped.length >= 2) {
            for (const n of cleanNameArr) {
              if (n.includes(stripped)) candidates.add(n);
            }
          }
          s.candidates = Array.from(candidates).slice(0, 5);
        }
      } catch (e) {
        // 候補補完に失敗しても取得自体は継続
      }
    }

    if (staffList.length === 0) {
      // 表自体はあるが氏名を抽出できない → ページ構造の変更
      if (exists) return fail('layout_changed', { ...detail });
      // 表そのものが無い → 応答が想定外（JS描画・ブロックページなど）
      return fail('empty_page', { ...detail });
    }

    return Response.json({ staffList, charset });
  } catch (error) {
    console.error('scrapeStaffNames error:', error);
    return Response.json({ error: '処理中にエラーが発生しました' }, { status: 500 });
  }
});