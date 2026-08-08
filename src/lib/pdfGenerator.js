let cachedFontBase64 = null;       // 変数TTF（400・フルカバレッジ・髙対応）
let cachedMediumFontBase64 = null; // fontsource 500 woff（Medium）

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

async function fetchFontBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return arrayBufferToBase64(await res.arrayBuffer());
}

async function fetchArrayBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
}

// woff → TTF 変換（ブラウザ版jsPDFがwoffのメタデータをパースできないため）
// woffのDEFLATE圧縮テーブルをDecompressionStreamで展開し、sfnt(TTF)に再構築
async function woffToTtfArrayBuffer(woffBuffer) {
  const dv = new DataView(woffBuffer);
  const flavor = dv.getUint32(4);
  const numTables = dv.getUint16(12);
  const tables = [];
  let off = 44;
  for (let i = 0; i < numTables; i++) {
    tables.push({
      tag: dv.getUint32(off),
      offset: dv.getUint32(off + 4),
      compLength: dv.getUint32(off + 8),
      origLength: dv.getUint32(off + 12),
      origChecksum: dv.getUint32(off + 16),
    });
    off += 20;
  }
  const decompressed = {};
  for (const t of tables) {
    const compData = woffBuffer.slice(t.offset, t.offset + t.compLength);
    if (t.compLength === t.origLength) {
      decompressed[t.tag] = new Uint8Array(compData);
    } else {
      const ds = new DecompressionStream('deflate');
      const stream = new Blob([compData]).stream().pipeThrough(ds);
      const out = await new Response(stream).arrayBuffer();
      decompressed[t.tag] = new Uint8Array(out);
    }
  }
  let searchRange = 1, entrySelector = 0;
  while (searchRange * 2 <= numTables) { searchRange *= 2; entrySelector++; }
  searchRange *= 16;
  const rangeShift = numTables * 16 - searchRange;
  const headerSize = 12;
  const dirSize = numTables * 16;
  let dataStart = headerSize + dirSize;
  const records = [];
  let cursor = dataStart;
  for (const t of tables) {
    const data = decompressed[t.tag];
    const paddedLen = Math.ceil(data.length / 4) * 4;
    records.push({ tag: t.tag, checksum: t.origChecksum, offset: cursor, length: data.length, data, paddedLen });
    cursor += paddedLen;
  }
  const ttf = new Uint8Array(cursor);
  const ttfDv = new DataView(ttf.buffer);
  ttfDv.setUint32(0, flavor);
  ttfDv.setUint16(4, numTables);
  ttfDv.setUint16(6, searchRange);
  ttfDv.setUint16(8, entrySelector);
  ttfDv.setUint16(10, rangeShift);
  let rOff = 12;
  for (const r of records) {
    ttfDv.setUint32(rOff, r.tag);
    ttfDv.setUint32(rOff + 4, r.checksum);
    ttfDv.setUint32(rOff + 8, r.offset);
    ttfDv.setUint32(rOff + 12, r.length);
    rOff += 16;
  }
  let dOff = dataStart;
  for (const r of records) {
    ttf.set(r.data, dOff);
    dOff += r.paddedLen;
  }
  return ttf.buffer;
}

// 2フォント読み込み:
//  - full: 変数TTF（400・フルカバレッジ・髙などの環境依存文字対応）。髙含みテキスト用および Medium 取得失敗時のフォールバック。
//  - medium: fontsource Noto Sans JP 500 woff（Medium・JIS第1・第2水準）。髙は含まないため full で補完。
async function loadJapaneseFont() {
  if (!cachedFontBase64) {
    try {
      cachedFontBase64 = await fetchFontBase64('https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf');
    } catch (e) { /* full 取得失敗時は medium のみで続行 */ }
  }
  if (!cachedMediumFontBase64) {
    try {
      const woffBuffer = await fetchArrayBuffer('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.1.0/files/noto-sans-jp-japanese-500-normal.woff');
      const ttfBuffer = await woffToTtfArrayBuffer(woffBuffer);
      cachedMediumFontBase64 = arrayBufferToBase64(ttfBuffer);
    } catch (e) { /* woff→TTF変換失敗時は full のみで続行 */ }
  }
  if (!cachedFontBase64 && !cachedMediumFontBase64) {
    throw new Error('フォントの読み込みに失敗しました');
  }
  return { full: cachedFontBase64, medium: cachedMediumFontBase64 };
}

function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) return [99, 102, 241];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r || 0, g || 0, b || 0];
}

function normalizeSlot(slot) {
  return slot === '開場前' ? '開場中' : (slot || '開場中');
}

function compareByOrder(a, b) {
  const oA = Number.isFinite(Number(a?.order)) ? Number(a.order) : Number.MAX_SAFE_INTEGER;
  const oB = Number.isFinite(Number(b?.order)) ? Number(b.order) : Number.MAX_SAFE_INTEGER;
  if (oA !== oB) return oA - oB;
  return String(a?.name || '').localeCompare(String(b?.name || ''), 'ja');
}

const TIME_SLOTS = ['開場中', '開演中', '終演後'];

const SLOT_COLORS = {
  '開場中': { headerBg: [253, 230, 138], headerText: [69, 26, 3],   border: [251, 191, 36] },
  '開演中': { headerBg: [191, 219, 254], headerText: [23, 37, 84],  border: [96, 165, 250] },
  '終演後': { headerBg: [203, 213, 225], headerText: [15, 23, 42],  border: [148, 163, 184] },
};

const SLOT_NOTE_KEY = { '開場中': 'note_before', '開演中': 'note_during', '終演後': 'note_after' };

// スロット → イベント時刻フィールド対応（開場中=開場時間, 開演中=開演時間, 終演後=終演時間）
const SLOT_TIME_FIELDS = {
  '開場中': ['time_open', 'time_open_end'],
  '開演中': ['time_start', 'time_start_end'],
  '終演後': ['time_end', 'time_end_end'],
};

function formatSlotTimeRange(event, slot) {
  const fields = SLOT_TIME_FIELDS[slot];
  if (!fields || !event) return '';
  const start = event[fields[0]];
  const end = event[fields[1]];
  if (!start && !end) return '';
  if (start && end) return `${start}〜${end}`;
  return start || end;
}

// 役割バッジのスタイル（役割名 → [背景, 枠, テキスト]）
const ROLE_BADGE_STYLES = {
  'インカム': { bg: [255, 237, 213], border: [253, 186, 116], text: [154, 52, 18] },
  'セクションチーフ': { bg: [243, 232, 255], border: [216, 180, 254], text: [107, 33, 168] },
  'バラシ': { bg: [207, 250, 254], border: [103, 232, 249], text: [21, 94, 117] },
};
const ROLE_BADGE_DEFAULT = { bg: [241, 245, 249], border: [148, 163, 184], text: [51, 65, 85] };

// A4縦・コンパクト設定
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 5;
const COL_GAP = 2.5;
const CARD_GAP = 1.2;
const TITLE_H = 12;
const COL_HEADER_H = 8.5;
const CARD_HEADER_H = 5.5;
const STAFF_FONT_SIZE = 7;
const STAFF_LINE_H = 3.8;
const CARD_PADDING_V = 1;   // スタッフエリア上下パディング合計
const SIDE_HEADER_H = 3.5;
const CHECKBOX_SIZE = 2.2;
const CHECKBOX_GAP = 0.5;
const CHIEF_LINE_H = 3.4; // チーフ印字行の高さ（チーフがある場合のみ）

function getChiefs(pos) {
  return (pos.chief_names && pos.chief_names.length > 0)
    ? pos.chief_names
    : (pos.chief_name ? [pos.chief_name] : []);
}

function getColWidth() {
  return (PAGE_W - 2 * MARGIN - 2 * COL_GAP) / 3;
}

function getColX(index) {
  return MARGIN + index * (getColWidth() + COL_GAP);
}

function calcCardHeight(pos) {
  const splitBySide = Boolean(pos.split_by_side);
  const staffCount = splitBySide
    ? Math.max((pos.staff_names_kamite || []).length, (pos.staff_names_shimote || []).length)
    : (pos.staff_names || []).length;
  const extraH = splitBySide ? SIDE_HEADER_H : 0;
  const chiefH = getChiefs(pos).length > 0 ? CHIEF_LINE_H : 0;
  return CARD_HEADER_H + chiefH + extraH + (staffCount > 0 ? staffCount * STAFF_LINE_H : STAFF_LINE_H) + CARD_PADDING_V;
}

function drawTitle(doc, event) {
  doc.setFontSize(11);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(event.name || '', MARGIN, MARGIN + 5);
  doc.setFontSize(8);
  let dateStr = '';
  if (event.date) {
    const d = new Date(event.date);
    dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  const subText = `${dateStr}${event.venue ? '　' + event.venue : ''}`;
  if (subText) doc.text(subText, MARGIN, MARGIN + 10);
}

function drawStaffRow(doc, name, staffData, slot, x, y, w, cardBottom) {
  if (y + STAFF_LINE_H > cardBottom - 0.3) return false;
  const textY = y + STAFF_LINE_H * 0.78;
  const nameX = x + CHECKBOX_SIZE + CHECKBOX_GAP;

  // 手書きチェック用空欄ボックス（枠線のみ）— 名前の左側
  const boxY = y + (STAFF_LINE_H - CHECKBOX_SIZE) / 2;
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.15);
  doc.rect(x, boxY, CHECKBOX_SIZE, CHECKBOX_SIZE, 'S');

  doc.setFontSize(STAFF_FONT_SIZE);
  doc.setFont('NotoSansJP', 'normal');
  const nameColor = staffData?.color;
  if (nameColor) {
    const [r, g, b] = hexToRgb(nameColor);
    doc.setTextColor(r, g, b);
  } else {
    doc.setTextColor(15, 23, 42);
  }
  doc.text(name, nameX, textY);

  let cursorX = nameX + doc.getTextWidth(name) + 1;

  const slotNoteKey = SLOT_NOTE_KEY[slot];
  const slotNote = slotNoteKey ? staffData?.[slotNoteKey] : null;
  const displayNote = slotNote || staffData?.note;
  if (displayNote && cursorX + 2 < x + w) {
    doc.setTextColor(245, 158, 11);
    doc.text('!', cursorX, textY);
    cursorX += 2.5;
  }

  const badgeTop = y + 0.4;
  const badgeH = STAFF_LINE_H - 0.8;
  const badgeTextY = badgeTop + badgeH * 0.72;

  if (staffData?.costume_change && cursorX + 6 < x + w) {
    doc.setFontSize(5.5);
    const badgeText = '着替';
    const badgeW = doc.getTextWidth(badgeText) + 1.5;
    doc.setFillColor(243, 232, 255); doc.setDrawColor(216, 180, 254); doc.setLineWidth(0.15);
    doc.roundedRect(cursorX, badgeTop, badgeW, badgeH, 0.4, 0.4, 'FD');
    doc.setTextColor(126, 34, 206);
    doc.text(badgeText, cursorX + 0.8, badgeTextY);
    cursorX += badgeW + 0.8;
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  if (staffData?.break && cursorX + 6 < x + w) {
    doc.setFontSize(5.5);
    const badgeText = '休憩';
    const badgeW = doc.getTextWidth(badgeText) + 1.5;
    doc.setFillColor(224, 242, 254); doc.setDrawColor(125, 211, 252); doc.setLineWidth(0.15);
    doc.roundedRect(cursorX, badgeTop, badgeW, badgeH, 0.4, 0.4, 'FD');
    doc.setTextColor(3, 105, 161);
    doc.text(badgeText, cursorX + 0.8, badgeTextY);
    cursorX += badgeW + 0.8;
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  // 役割バッジ（着替・休憩の直後に描画）
  const roles = staffData?.roles || [];
  if (roles.length > 0) {
    doc.setFontSize(5.5);
    for (const role of roles) {
      const roleText = String(role);
      const style = ROLE_BADGE_STYLES[roleText] || ROLE_BADGE_DEFAULT;
      const badgeW = doc.getTextWidth(roleText) + 1.5;
      if (cursorX + badgeW > x + w) break;
      doc.setFillColor(style.bg[0], style.bg[1], style.bg[2]);
      doc.setDrawColor(style.border[0], style.border[1], style.border[2]);
      doc.setLineWidth(0.15);
      doc.roundedRect(cursorX, badgeTop, badgeW, badgeH, 0.4, 0.4, 'FD');
      doc.setTextColor(style.text[0], style.text[1], style.text[2]);
      doc.text(roleText, cursorX + 0.8, badgeTextY);
      cursorX += badgeW + 0.8;
    }
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  return true;
}

function drawCard(doc, pos, x, y, w, staffMap, slot) {
  const splitBySide = Boolean(pos.split_by_side);
  const kamiteNames = splitBySide ? (pos.staff_names_kamite || []) : [];
  const shimoteNames = splitBySide ? (pos.staff_names_shimote || []) : [];
  const staffNames = splitBySide
    ? [...new Set([...kamiteNames, ...shimoteNames])]
    : (pos.staff_names || []);
  const assignedCount = staffNames.length;
  const requiredCount = pos.required_count || 0;
  const cardH = calcCardHeight(pos);

  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15); doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, cardH, 1, 1, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y, w, CARD_HEADER_H, 1, 1, 'F');
  doc.rect(x, y + CARD_HEADER_H - 1, w, 1, 'F');
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15);
  doc.line(x, y + CARD_HEADER_H, x + w, y + CARD_HEADER_H);

  const headerTextY = y + CARD_HEADER_H * 0.70;

  const [r, g, b] = hexToRgb(pos.color || '#6366f1');
  doc.setFillColor(r, g, b);
  doc.circle(x + 2.2, y + CARD_HEADER_H / 2, 0.9, 'F');

  doc.setFontSize(6); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(100, 116, 139);
  const countText = requiredCount > 0 ? `${assignedCount}/${requiredCount}名` : `${assignedCount}名`;
  doc.text(countText, x + w - 1.5, headerTextY, { align: 'right' });
  const countTextW = doc.getTextWidth(countText);

  doc.setFontSize(8); doc.setTextColor(15, 23, 42);
  let posName = pos.name || '';
  const maxNameW = (x + w - 1.5 - countTextW - 1.5) - (x + 5);
  while (maxNameW > 0 && doc.getTextWidth(posName) > maxNameW && posName.length > 1) {
    posName = posName.slice(0, -1);
  }
  if (posName !== (pos.name || '') && posName.length > 0) posName = posName.slice(0, -1) + '…';
  doc.text(posName, x + 5, headerTextY);

  const chiefs = getChiefs(pos);
  const chiefH = chiefs.length > 0 ? CHIEF_LINE_H : 0;
  let staffY = y + CARD_HEADER_H + 0.3;
  const cardBottom = y + cardH;

  // チーフ印字（ヘッダー直下）
  if (chiefs.length > 0) {
    const chiefY = y + CARD_HEADER_H;
    doc.setFontSize(5.5); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(107, 33, 168);
    const chiefText = `チーフ: ${chiefs.join('・')}`;
    let chiefDisplay = chiefText;
    const maxChiefW = w - 3;
    while (maxChiefW > 0 && doc.getTextWidth(chiefDisplay) > maxChiefW && chiefDisplay.length > 1) {
      chiefDisplay = chiefDisplay.slice(0, -1);
    }
    if (chiefDisplay !== chiefText && chiefDisplay.length > 0) chiefDisplay = chiefDisplay.slice(0, -1) + '…';
    doc.text(chiefDisplay, x + 2.5, chiefY + 2.2);
    staffY = chiefY + chiefH + 0.3;
  }

  if (splitBySide) {
    const halfW = w / 2;
    doc.setFillColor(248, 250, 252);
    doc.rect(x, staffY, halfW, SIDE_HEADER_H, 'F');
    doc.rect(x + halfW, staffY, halfW, SIDE_HEADER_H, 'F');
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.15);
    doc.line(x + halfW, staffY, x + halfW, cardBottom);
    doc.line(x, staffY + SIDE_HEADER_H, x + w, staffY + SIDE_HEADER_H);
    doc.setFontSize(6); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('上手', x + halfW / 2, staffY + SIDE_HEADER_H * 0.72, { align: 'center' });
    doc.text('下手', x + halfW + halfW / 2, staffY + SIDE_HEADER_H * 0.72, { align: 'center' });
    const nameStartY = staffY + SIDE_HEADER_H;
    let ky = nameStartY;
    for (const nm of kamiteNames) {
      if (drawStaffRow(doc, nm, staffMap.get(nm), slot, x + 1.5, ky, halfW - 1.5, cardBottom)) ky += STAFF_LINE_H;
      else break;
    }
    let sy = nameStartY;
    for (const nm of shimoteNames) {
      if (drawStaffRow(doc, nm, staffMap.get(nm), slot, x + halfW + 1.5, sy, halfW - 1.5, cardBottom)) sy += STAFF_LINE_H;
      else break;
    }
  } else {
    let rowY = staffY + 0.3;
    for (const nm of staffNames) {
      if (drawStaffRow(doc, nm, staffMap.get(nm), slot, x + 2.5, rowY, w - 2.5, cardBottom)) rowY += STAFF_LINE_H;
      else break;
    }
    if (staffNames.length === 0) {
      doc.setFontSize(7); doc.setTextColor(153, 153, 153);
      doc.text('（未配置）', x + 2.5, staffY + 3);
    }
  }
  return cardH;
}

// カラムヘッダーをY座標指定で描画
function drawColumnHeaderAt(doc, slot, x, colW, slotPositions, staff, event, startY) {
  const colors = SLOT_COLORS[slot];
  const line1Y = startY + 3.2;
  const line2Y = startY + 6.8;

  doc.setDrawColor(...colors.border); doc.setLineWidth(0.4); doc.setFillColor(...colors.headerBg);
  doc.roundedRect(x, startY, colW, COL_HEADER_H, 1.5, 1.5, 'FD');

  doc.setFontSize(9); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(...colors.headerText);
  doc.text(slot, x + 2.5, line1Y);

  doc.setFontSize(6);
  const numCards = slotPositions.length;
  const slotRequiredCount = slotPositions.reduce((sum, p) => sum + (p.required_count || 0), 0);
  const slotAssignedNames = new Set();
  slotPositions.forEach(p => {
    if (p.split_by_side) {
      (p.staff_names_kamite || []).forEach(n => slotAssignedNames.add(n));
      (p.staff_names_shimote || []).forEach(n => slotAssignedNames.add(n));
    } else {
      (p.staff_names || []).forEach(n => slotAssignedNames.add(n));
    }
  });
  const slotAssignedCount = (staff || []).filter(s => slotAssignedNames.has(s.name)).length;
  const infoText = `${numCards}件  設定:${slotRequiredCount}名  配置:${slotAssignedCount}名`;
  doc.text(infoText, x + colW - 2, line1Y, { align: 'right' });

  // 時間帯（開場時刻など）
  const timeRange = formatSlotTimeRange(event, slot);
  if (timeRange) {
    doc.setFontSize(6); doc.setTextColor(...colors.headerText);
    doc.text(timeRange, x + 2.5, line2Y);
  }

  return startY + COL_HEADER_H + 1.5;
}

function drawColumns(doc, positions, staff, event) {
  const colW = getColWidth();
  const colStartY = MARGIN + TITLE_H;
  const pageBottom = PAGE_H - MARGIN;

  const staffMap = new Map();
  (staff || []).forEach(s => staffMap.set(s.name, s));

  const sortedPositions = [...positions].sort(compareByOrder);
  const grouped = {};
  TIME_SLOTS.forEach(slot => { grouped[slot] = []; });
  sortedPositions.forEach(pos => {
    const slot = normalizeSlot(pos.time_slot);
    if (!grouped[slot]) grouped[slot] = [];
    grouped[slot].push(pos);
  });

  // 各スロットのカードリストをページ分割（スロットまたいで同一ページ行を揃える）
  // ページごとに3スロット横並びで描画するため、
  // スロットごとにカードをページ分割してから、同一ページ番号分を一緒に描画する

  // 各スロットのカードを「ページ×カードリスト」に分割
  const slotPages = {}; // slotPages[slot] = [[pos, ...], [pos, ...], ...]
  TIME_SLOTS.forEach(slot => {
    const slotPositions = grouped[slot] || [];
    const pages = [];
    let currentPageCards = [];
    let currentY = colStartY + COL_HEADER_H + 1.5;

    slotPositions.forEach(pos => {
      const cardH = calcCardHeight(pos);
      if (currentY + cardH > pageBottom && currentPageCards.length > 0) {
        pages.push(currentPageCards);
        currentPageCards = [];
        currentY = colStartY + COL_HEADER_H + 1.5;
      }
      currentPageCards.push(pos);
      currentY += cardH + CARD_GAP;
    });
    if (currentPageCards.length > 0 || pages.length === 0) {
      pages.push(currentPageCards);
    }
    slotPages[slot] = pages;
  });

  // 最大ページ数
  const maxPages = Math.max(...TIME_SLOTS.map(slot => slotPages[slot].length));

  let maxBottom = colStartY;

  for (let pageIdx = 0; pageIdx < maxPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage();

    if (pageIdx === 0) {
      // タイトルは1ページ目のみ
      // drawTitle は外で呼ぶので不要
    }

    TIME_SLOTS.forEach((slot, colIdx) => {
      const x = getColX(colIdx);
      const slotPositions = grouped[slot] || [];
      const pageCards = slotPages[slot][pageIdx] || [];

      // ヘッダーは全ページで描画
      let cardY = drawColumnHeaderAt(doc, slot, x, colW, slotPositions, staff, event, colStartY);

      if (pageCards.length === 0) {
        if (pageIdx === 0 && slotPositions.length === 0) {
          doc.setFontSize(7); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(153, 153, 153);
          doc.text('ポジションがありません', x + colW / 2, cardY + 4, { align: 'center' });
        }
        return;
      }

      pageCards.forEach(pos => {
        drawCard(doc, pos, x, cardY, colW, staffMap, slot);
        cardY += calcCardHeight(pos) + CARD_GAP;
      });

      maxBottom = Math.max(maxBottom, cardY - CARD_GAP);
    });
  }

  return maxBottom;
}

function drawUnassigned(doc, positions, staff, startY) {
  const assignedNames = new Set();
  positions.forEach(pos => {
    if (pos.split_by_side) {
      (pos.staff_names_kamite || []).forEach(n => assignedNames.add(n));
      (pos.staff_names_shimote || []).forEach(n => assignedNames.add(n));
    } else {
      (pos.staff_names || []).forEach(n => assignedNames.add(n));
    }
  });
  const sortedStaff = [...staff].sort(compareByOrder);
  const unassigned = sortedStaff.filter(s => !assignedNames.has(s.name));
  if (unassigned.length === 0) return;

  let y = startY + 3;
  if (y + 12 > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN + 3; }

  const sectionW = PAGE_W - 2 * MARGIN;
  doc.setDrawColor(252, 211, 77); doc.setLineWidth(0.25); doc.setFillColor(255, 251, 235);
  doc.roundedRect(MARGIN, y, sectionW, 5, 1, 1, 'FD');
  doc.setFontSize(8); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(120, 53, 15);
  doc.text(`未配置スタッフ（${unassigned.length}名）`, MARGIN + 2.5, y + 3.3);

  y += 6;
  doc.setFontSize(7); doc.setFont('NotoSansJP', 'normal');
  let ux = MARGIN + 2;
  unassigned.forEach(s => {
    const nameW = doc.getTextWidth(s.name) + 3;
    if (ux + nameW > PAGE_W - MARGIN - 2) { ux = MARGIN + 2; y += 4.5; }
    doc.setDrawColor(253, 230, 138); doc.setFillColor(255, 251, 235); doc.setLineWidth(0.15);
    doc.roundedRect(ux, y - 3, nameW, 4, 0.4, 0.4, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.text(s.name, ux + 1.5, y - 0.3);
    ux += nameW + 1.5;
  });
}

function drawTimelineTable(doc, positions, staff) {
  const sortedStaff = [...staff].sort(compareByOrder);
  const sortedPositions = [...positions].sort(compareByOrder);
  const timeline = {};
  sortedStaff.forEach(s => { timeline[s.name] = { '開場中': [], '開演中': [], '終演後': [] }; });
  sortedPositions.forEach(pos => {
    const slot = normalizeSlot(pos.time_slot);
    const names = pos.split_by_side
      ? [...new Set([...(pos.staff_names_kamite || []), ...(pos.staff_names_shimote || [])])]
      : (pos.staff_names || []);
    names.forEach(name => {
      if (!timeline[name]) timeline[name] = { '開場中': [], '開演中': [], '終演後': [] };
      if (timeline[name][slot]) timeline[name][slot].push(pos.name);
    });
  });

  const colW = (PAGE_W - 2 * MARGIN) / 4;
  const rowH = 8;
  let y = MARGIN + 5;

  doc.setFillColor(202, 202, 202);
  doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, rowH, 'F');
  doc.setFontSize(10); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(0, 0, 0);
  ['スタッフ名', '開場中', '開演中', '終演後'].forEach((label, i) => {
    doc.text(label, MARGIN + i * colW + colW / 2, y + 5.5, { align: 'center' });
  });
  doc.setDrawColor(187, 187, 187); doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, rowH, 'S');
  y += rowH;

  doc.setFontSize(9); doc.setFont('NotoSansJP', 'normal');
  Object.entries(timeline).forEach(([name, slots]) => {
    if (y + rowH > PAGE_H - MARGIN) { doc.addPage(); y = MARGIN; }
    doc.setFillColor(243, 237, 226);
    doc.rect(MARGIN, y, colW, rowH, 'F');
    doc.text(name, MARGIN + 2, y + 5.5);
    TIME_SLOTS.forEach((slot, i) => {
      const cellX = MARGIN + (i + 1) * colW;
      const posNames = slots[slot] || [];
      if (posNames.length > 0) {
        doc.setFillColor(255, 254, 232);
        doc.rect(cellX, y, colW, rowH, 'F');
        doc.text(posNames.join('・'), cellX + 2, y + 5.5);
      }
    });
    doc.setDrawColor(187, 187, 187); doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, rowH, 'S');
    for (let i = 1; i < 4; i++) doc.line(MARGIN + i * colW, y, MARGIN + i * colW, y + rowH);
    y += rowH;
  });
}

export async function generatePositionPDF(data, filename) {
  const { jsPDF } = await import('jspdf');
  const { full: fullFontBase64, medium: mediumFontBase64 } = await loadJapaneseFont();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // フォント登録
  // NotoSansJP: Medium(500) をデフォルト。medium 未取得時は full(400) をデフォルト。
  const hasMedium = Boolean(mediumFontBase64);
  const hasFull = Boolean(fullFontBase64);
  if (hasMedium) {
    doc.addFileToVFS('NotoSansJPM.ttf', mediumFontBase64);
    doc.addFont('NotoSansJPM.ttf', 'NotoSansJP', 'normal');
  } else if (hasFull) {
    doc.addFileToVFS('NotoSansJPFull.ttf', fullFontBase64);
    doc.addFont('NotoSansJPFull.ttf', 'NotoSansJP', 'normal');
  }
  // NotoSansJPFull: フルカバレッジ(400・髙対応)。Medium をデフォルトにする場合のみ別名登録し、髙含みテキストに使用。
  const fullFontName = hasFull && hasMedium ? 'NotoSansJPFull' : null;
  if (fullFontName) {
    doc.addFileToVFS('NotoSansJPFull.ttf', fullFontBase64);
    doc.addFont('NotoSansJPFull.ttf', fullFontName, 'normal');
  }

  const TAKA = '髙';
  function selectFontForText(text) {
    if (fullFontName && text && String(text).includes(TAKA)) {
      doc.setFont(fullFontName, 'normal'); // 髙: フルカバレッジ(400)
    } else {
      doc.setFont('NotoSansJP', 'normal'); // それ以外: Medium(500)
    }
  }

  // doc.text / getTextWidth をラップ: ポジションPDFは髙の有無でフォント切替、タイムラインは従来(400)を維持
  let pdfMode = 'position';
  const origText = doc.text.bind(doc);
  doc.text = function (text, x, y, options) {
    if (pdfMode === 'timeline') {
      if (fullFontName) doc.setFont(fullFontName, 'normal'); else doc.setFont('NotoSansJP', 'normal');
    } else {
      selectFontForText(text);
    }
    return origText(text, x, y, options);
  };
  const origGetTextWidth = doc.getTextWidth.bind(doc);
  doc.getTextWidth = function (text) {
    if (pdfMode === 'timeline') {
      if (fullFontName) doc.setFont(fullFontName, 'normal'); else doc.setFont('NotoSansJP', 'normal');
    } else {
      selectFontForText(text);
    }
    return origGetTextWidth(text);
  };

  if (data.type === 'timeline') {
    pdfMode = 'timeline';
    drawTimelineTable(doc, data.positions || [], data.staff || []);
  } else {
    pdfMode = 'position';
    drawTitle(doc, data.event || {});
    drawColumns(doc, data.positions || [], data.staff || [], data.event || {});
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}