import { getParts } from "@/lib/showParts";

let cachedFontBase64 = null;       // 変数TTF（400・フルカバレッジ・髙対応）
let cachedMediumFontBase64 = null; // fontsource 500 woff（Medium）
let cachedBizUdFontBase64 = null;  // BIZ UDGothic Bold TTF（環境依存文字網羅・太字）

// 配置表PDFの埋め込みフォントをBIZ UDゴシックに切替えるトグル。
// false にすると従来の Noto Sans JP（Medium＋フルカバレッジ）構成にロールバックします。
const USE_BIZ_UD_FONT = true;

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
export async function loadJapaneseFont() {
  if (USE_BIZ_UD_FONT && !cachedBizUdFontBase64) {
    try {
      cachedBizUdFontBase64 = await fetchFontBase64('https://cdn.jsdelivr.net/gh/googlefonts/morisawa-biz-ud-gothic@main/fonts/ttf/BIZUDGothic-Bold.ttf');
    } catch (e) { /* BIZ UD 取得失敗時は Noto 構成へフォールバック */ }
  }
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
  if (!cachedBizUdFontBase64 && !cachedFontBase64 && !cachedMediumFontBase64) {
    throw new Error('フォントの読み込みに失敗しました');
  }
  return { bizud: cachedBizUdFontBase64, full: cachedFontBase64, medium: cachedMediumFontBase64 };
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
  '開場中': { tintBg: [254, 249, 230], headerBg: [253, 230, 138], headerText: [69, 26, 3],   border: [245, 158, 11], divider: [253, 224, 168] },
  '開演中': { tintBg: [237, 244, 254], headerBg: [191, 219, 254], headerText: [23, 37, 84],  border: [59, 130, 246], divider: [191, 219, 254] },
  '終演後': { tintBg: [238, 242, 247], headerBg: [203, 213, 225], headerText: [15, 23, 42],  border: [100, 116, 139], divider: [203, 213, 225] },
};

const SLOT_NOTE_KEY = { '開場中': 'note_before', '開演中': 'note_during', '終演後': 'note_after' };

// 共通備考と該当時間帯の備考を統合して返す（重複は1つにまとめる）
function getStaffNote(staffData, slot) {
  if (!staffData) return '';
  const common = staffData.note ? String(staffData.note) : '';
  const slotNoteKey = SLOT_NOTE_KEY[slot];
  const slotNote = slotNoteKey && staffData[slotNoteKey] ? String(staffData[slotNoteKey]) : '';
  const parts = [];
  if (common) parts.push(common);
  if (slotNote && slotNote !== common) parts.push(slotNote);
  return parts.join(' ／ ');
}

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

// ISCT Design System カラー（ブランドネイビー基準・Noto Sans JP・8/12/24px 体系）
const ISCT = {
  primary: [28, 49, 120],          // #1c3178 ブランドプライマリ
  primaryText: [255, 255, 255],    // ネイビー上の白文字
  secondary: [127, 150, 194],      // #7f96c2
  tertiary: [207, 219, 237],       // #cfdbed
  quaternary: [249, 251, 255],     // #f9fbff
  monoPrimary: [26, 26, 26],       // #1a1a1a
  monoSecondary: [118, 118, 118],  // #767676
  monoTertiary: [204, 204, 204],   // #cccccc
  monoQuaternary: [235, 235, 235], // #ebebeb
  monoQuinary: [250, 250, 250],    // #fafafa
};

// A4縦・コンパクト設定
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 5;
const COL_GAP = 2.5;
const CARD_GAP = 1.2;
const TITLE_H = 12;
const COL_HEADER_H = 7;
const CARD_HEADER_H = 4.2;
const STAFF_FONT_SIZE = 7.5;
const STAFF_LINE_H = 4.3;
const CARD_PADDING_V = 0.6;   // スタッフエリア上下パディング合計
const SIDE_HEADER_H = 2.8;
const CHECKBOX_SIZE = 2;
const CHECKBOX_GAP = 0.4;
const CHIEF_LINE_H = 3.2; // チーフ印字行の高さ（チーフがある場合のみ）
const POS_NOTE_LINE_H = 2.8; // ポジション備考行の高さ（ポジション名の下に印字）
const NOTE_FONT_SIZE = 5.4; // 備考のフォントサイズ（スタッフ名の下に小さく印字）
const NOTE_LINE_H = 2.8;    // 備考行の高さ
const PENLIGHT_ICON_W = 2.6;   // ペンライトアイコン（筒＋光束）の幅
const PENLIGHT_ICON_H = 1.4;   // ペンライトアイコンの高さ
const BENTO_ICON_W = 1.8;      // 弁当アイコン（箱）の幅
const BENTO_ICON_H = 1.6;      // 弁当アイコン（箱＋箸）の高さ
const CHECK_ICON_GAP = 0.5;    // アイコンとチェック欄の間隔
const CHECK_ITEM_GAP = 1.2;    // ペンライト項目と弁当項目の間隔

// ペンライト（筒＋光束）アイコンを描画
function drawPenlightIcon(doc, cx, cy) {
  const bodyW = 1.0, bodyH = 0.6;
  const bodyX = cx - PENLIGHT_ICON_W / 2;
  // 本体（筒）
  doc.setFillColor(59, 130, 246);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.12);
  doc.roundedRect(bodyX, cy - bodyH / 2, bodyW, bodyH, 0.18, 0.18, 'FD');
  // 発光先端
  doc.setFillColor(252, 211, 77);
  doc.circle(bodyX + bodyW, cy, 0.26, 'F');
  // 光束（三角コーン）
  doc.setFillColor(254, 240, 138);
  doc.setDrawColor(252, 211, 77);
  doc.setLineWidth(0.08);
  const beamStart = bodyX + bodyW + 0.26;
  const beamEnd = cx + PENLIGHT_ICON_W / 2;
  doc.triangle(beamStart, cy, beamEnd, cy - 0.55, beamEnd, cy + 0.55, 'F');
}

// 弁当（箱＋箸）アイコンを描画
function drawBentoIcon(doc, cx, cy) {
  const boxW = 1.7, boxH = 1.0;
  const boxX = cx - boxW / 2;
  const boxY = cy - BENTO_ICON_H / 2 + 0.3;
  // 箸（2本）を箱の上に斜めに置く
  doc.setDrawColor(146, 109, 50);
  doc.setLineWidth(0.16);
  const stickLeft = boxX + 0.25;
  const stickRight = boxX + boxW - 0.15;
  doc.line(stickLeft, boxY - 0.05, stickRight, boxY - 0.3);
  doc.line(stickLeft + 0.05, boxY + 0.05, stickRight + 0.05, boxY - 0.2);
  // 箱
  doc.setFillColor(34, 197, 94);
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(0.12);
  doc.roundedRect(boxX, boxY, boxW, boxH, 0.2, 0.2, 'FD');
  // 蓋の線
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(0.1);
  doc.line(boxX + 0.2, boxY + boxH * 0.4, boxX + boxW - 0.2, boxY + boxH * 0.4);
}

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

function calcCardHeight(pos, staffMap) {
  const splitBySide = Boolean(pos.split_by_side);
  const staffNamesList = splitBySide ? (pos.staff_names_kamite || []) : (pos.staff_names || []);
  const staffCount = splitBySide
    ? Math.max((pos.staff_names_kamite || []).length, (pos.staff_names_shimote || []).length)
    : (pos.staff_names || []).length;
  const extraH = splitBySide ? SIDE_HEADER_H : 0;
  // チーフはポジション名の横にインライン表示するため高さ不要
  const posNoteH = pos.notes && String(pos.notes).trim() ? POS_NOTE_LINE_H : 0;
  // 備考を持つスタッフの行は高さを追加（備考行の数だけ）
  let noteExtra = 0;
  if (staffMap) {
    const slot = normalizeSlot(pos.time_slot);
    const countNotes = (names) => names.reduce(
      (sum, n) => sum + (getStaffNote(staffMap.get(n), slot) ? NOTE_LINE_H : 0), 0
    );
    noteExtra = splitBySide
      ? Math.max(countNotes(pos.staff_names_kamite || []), countNotes(pos.staff_names_shimote || []))
      : countNotes(staffNamesList);
  }
  return CARD_HEADER_H + posNoteH + extraH + (staffCount > 0 ? staffCount * STAFF_LINE_H : STAFF_LINE_H) + noteExtra + CARD_PADDING_V;
}

// 帳票風ヘッダー: 公演名・日時・会場・各時間帯・チーフ名・クローク名を帯状にまとめ、
// その下のコンテンツ開始Yを返す
function drawReportHeader(doc, event, partLabel) {
  const x0 = MARGIN;
  const w = PAGE_W - 2 * MARGIN;

  // 公演名（大）
  doc.setFontSize(13);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(...ISCT.monoPrimary);
  doc.text(event.name || '', x0, MARGIN + 4.5);
  if (partLabel) {
    doc.setFontSize(11);
    doc.setTextColor(...ISCT.primary);
    doc.text(partLabel, PAGE_W - MARGIN, MARGIN + 4.5, { align: 'right' });
  }

  // 日時・会場
  doc.setFontSize(8);
  doc.setTextColor(...ISCT.monoSecondary);
  let dateStr = '';
  if (event.date) {
    const d = new Date(event.date);
    dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  const subText = [dateStr, event.venue].filter(Boolean).join('　');
  if (subText) doc.text(subText, x0, MARGIN + 8.5);

  // 上部アクセント罫線
  let y = MARGIN + 10;
  doc.setDrawColor(...ISCT.primary);
  doc.setLineWidth(0.5);
  doc.line(x0, y, x0 + w, y);
  y += 2;

  // 時間帯テーブル（先行/開場/開演/終演）
  const timeRows = [
    { label: '先行', start: event.time_priority, end: event.time_priority_end },
    { label: '開場', start: event.time_open, end: event.time_open_end },
    { label: '開演', start: event.time_start, end: event.time_start_end },
    { label: '終演', start: event.time_end, end: event.time_end_end },
  ];
  const timeColW = w / 4;
  const timeCellH = 7;
  const labelW = 10;
  timeRows.forEach((r, i) => {
    const cx = x0 + i * timeColW;
    doc.setDrawColor(...ISCT.monoTertiary);
    doc.setLineWidth(0.2);
    doc.setFillColor(...ISCT.quaternary);
    doc.rect(cx, y, timeColW, timeCellH, 'FD');
    // ラベル帯
    doc.setFillColor(...ISCT.tertiary);
    doc.rect(cx, y, labelW, timeCellH, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(...ISCT.primary);
    doc.text(r.label, cx + labelW / 2, y + timeCellH / 2, { align: 'center', baseline: 'middle' });
    // 時刻
    let range = '';
    if (r.start && r.end) range = `${r.start}〜${r.end}`;
    else if (r.start) range = `${r.start}〜`;
    else if (r.end) range = `〜${r.end}`;
    doc.setFontSize(9);
    doc.setTextColor(...ISCT.monoPrimary);
    doc.text(range || '－', cx + labelW + 1.5, y + timeCellH / 2, { baseline: 'middle' });
  });
  y += timeCellH;

  // チーフ・クローク行
  const chiefCloakH = 6.5;
  const halfW = w / 2;
  const ccLabelW = 14;
  // チーフ
  doc.setDrawColor(...ISCT.monoTertiary);
  doc.setLineWidth(0.2);
  doc.setFillColor(...ISCT.quaternary);
  doc.rect(x0, y, halfW, chiefCloakH, 'FD');
  doc.setFillColor(...ISCT.tertiary);
  doc.rect(x0, y, ccLabelW, chiefCloakH, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...ISCT.primary);
  doc.text('チーフ', x0 + ccLabelW / 2, y + chiefCloakH / 2, { align: 'center', baseline: 'middle' });
  doc.setFontSize(9);
  doc.setTextColor(...ISCT.monoPrimary);
  doc.text(event.chief_name || '', x0 + ccLabelW + 1.5, y + chiefCloakH / 2, { baseline: 'middle' });
  // 区切り
  doc.setDrawColor(...ISCT.monoTertiary);
  doc.setLineWidth(0.2);
  doc.line(x0 + halfW, y, x0 + halfW, y + chiefCloakH);
  // クローク
  doc.setFillColor(...ISCT.quaternary);
  doc.rect(x0 + halfW, y, halfW, chiefCloakH, 'FD');
  doc.setFillColor(...ISCT.tertiary);
  doc.rect(x0 + halfW, y, ccLabelW, chiefCloakH, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...ISCT.primary);
  doc.text('クローク', x0 + halfW + ccLabelW / 2, y + chiefCloakH / 2, { align: 'center', baseline: 'middle' });
  doc.setFontSize(9);
  doc.setTextColor(...ISCT.monoPrimary);
  doc.text(event.cloak_name || '', x0 + halfW + ccLabelW + 1.5, y + chiefCloakH / 2, { baseline: 'middle' });
  y += chiefCloakH;

  return y + 2; // コンテンツ開始Y
}

function drawStaffRow(doc, name, staffData, slot, x, y, w, cardBottom) {
  const note = getStaffNote(staffData, slot);
  const rowH = STAFF_LINE_H + (note ? NOTE_LINE_H : 0);
  if (y + rowH > cardBottom + 0.01) return 0;
  const textY = y + STAFF_LINE_H * 0.78;
  const nameX = x + 1;

  doc.setFontSize(STAFF_FONT_SIZE);
  doc.setFont('NotoSansJP', 'normal');
  const nameColor = staffData?.color;
  if (nameColor) {
    const [r, g, b] = hexToRgb(nameColor);
    doc.setTextColor(r, g, b);
  } else {
    doc.setTextColor(...ISCT.monoPrimary);
  }
  doc.text(name, nameX, textY);

  let cursorX = nameX + doc.getTextWidth(name) + 1;

  // 備考（共通＋該当時間帯を統合）をスタッフ名の下に小さく印字
  if (note) {
    doc.setFontSize(NOTE_FONT_SIZE);
    doc.setTextColor(...ISCT.monoSecondary);
    let noteText = note;
    const maxNoteW = x + w - nameX - 0.5;
    while (noteText.length > 1 && doc.getTextWidth(noteText) > maxNoteW) {
      noteText = noteText.slice(0, -1);
    }
    if (noteText !== note && noteText.length > 0) noteText = noteText.slice(0, -1) + '…';
    doc.text(noteText, nameX, y + STAFF_LINE_H + NOTE_LINE_H * 0.75);
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  const badgeTop = y + 0.4;
  const badgeH = STAFF_LINE_H - 0.8;
  const badgeTextY = badgeTop + badgeH * 0.72;
  const badgeMaxRight = x + w - 1;

  if (staffData?.costume_change && cursorX + 6 < badgeMaxRight) {
    doc.setFontSize(6.5);
    const badgeText = '着替';
    const badgeW = doc.getTextWidth(badgeText) + 1.5;
    doc.setFillColor(243, 232, 255); doc.setDrawColor(216, 180, 254); doc.setLineWidth(0.15);
    doc.roundedRect(cursorX, badgeTop, badgeW, badgeH, 0.4, 0.4, 'FD');
    doc.setTextColor(126, 34, 206);
    doc.text(badgeText, cursorX + 0.8, badgeTextY);
    cursorX += badgeW + 0.8;
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  if (staffData?.break && cursorX + 6 < badgeMaxRight) {
    doc.setFontSize(6.5);
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
      if (cursorX + badgeW > badgeMaxRight) break;
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

  return rowH;
}

// 連続リスト形式のポジション行を描画（角ばったデザイン・時間帯テーマカラー適用）
// 外枠・区切りは呼び出し側で描画済みの前提。本関数はタイトル帯＋スタッフエリアを描く。
function drawPositionRow(doc, pos, x, y, w, staffMap, slot, slotColor) {
  const splitBySide = Boolean(pos.split_by_side);
  const kamiteNames = splitBySide ? (pos.staff_names_kamite || []) : [];
  const shimoteNames = splitBySide ? (pos.staff_names_shimote || []) : [];
  const staffNames = splitBySide
    ? [...new Set([...kamiteNames, ...shimoteNames])]
    : (pos.staff_names || []);
  const assignedCount = staffNames.length;
  const requiredCount = pos.required_count || 0;
  const rowH = calcCardHeight(pos, staffMap);

  // --- タイトル帯（ポジション名＋チーフ＋説明を同一要素・同背景色） ---
  const hasPosNote = pos.notes && String(pos.notes).trim();
  const titleH = CARD_HEADER_H + (hasPosNote ? POS_NOTE_LINE_H : 0);

  // タイトル背景：時間帯テーマの淡色
  doc.setFillColor(...slotColor.tintBg);
  doc.rect(x, y, w, titleH, 'F');

  const headerTextY = y + CARD_HEADER_H * 0.70;

  // ポジションカラーのドット
  const [r, g, b] = hexToRgb(pos.color || '#6366f1');
  doc.setFillColor(r, g, b);
  doc.circle(x + 2.2, y + CARD_HEADER_H / 2, 0.9, 'F');

  // 人数（右端）
  doc.setFontSize(6.5); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(...ISCT.monoSecondary);
  const countText = requiredCount > 0 ? `${assignedCount}/${requiredCount}名` : `${assignedCount}名`;
  doc.text(countText, x + w - 1.5, headerTextY, { align: 'right' });
  const countTextW = doc.getTextWidth(countText);

  // ポジション名
  doc.setFontSize(7.5); doc.setTextColor(...ISCT.monoPrimary);
  let posName = pos.name || '';
  const chiefs = getChiefs(pos);
  // チーフ表記をポジション名の横に結合
  const chiefSuffix = chiefs.length > 0 ? `／チーフ ${chiefs.join('・')}` : '';
  // 名前+チーフ の全体幅で制限
  const maxNameW = (x + w - 1.5 - countTextW - 1.5) - (x + 5);
  let posNameW = doc.getTextWidth(posName);
  if (chiefSuffix) {
    doc.setFontSize(5.8);
    const chiefW = doc.getTextWidth(chiefSuffix);
    doc.setFontSize(7.5);
    while (posName.length > 1 && posNameW + chiefW > maxNameW) {
      posName = posName.slice(0, -1);
      posNameW = doc.getTextWidth(posName);
    }
  } else {
    while (posName.length > 1 && posNameW > maxNameW) {
      posName = posName.slice(0, -1);
      posNameW = doc.getTextWidth(posName);
    }
  }
  if (posName !== (pos.name || '') && posName.length > 0) posName = posName.slice(0, -1) + '…';
  doc.text(posName, x + 5, headerTextY);

  // チーフ表記をポジション名の直後（横）に印字
  if (chiefSuffix) {
    const chiefX = x + 5 + doc.getTextWidth(posName) + 0.6;
    doc.setFontSize(5.8);
    doc.setTextColor(...slotColor.border);
    doc.text(chiefSuffix, chiefX, headerTextY);
    doc.setFontSize(7.5);
  }

  // ポジション説明（タイトルと同じ要素・同じ背景色）
  if (hasPosNote) {
    doc.setFontSize(NOTE_FONT_SIZE);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(...ISCT.monoSecondary);
    let posNote = String(pos.notes);
    const maxNoteW = w - 3;
    while (posNote.length > 1 && doc.getTextWidth(posNote) > maxNoteW) {
      posNote = posNote.slice(0, -1);
    }
    if (posNote !== String(pos.notes) && posNote.length > 0) posNote = posNote.slice(0, -1) + '…';
    doc.text(posNote, x + 1, y + CARD_HEADER_H + POS_NOTE_LINE_H * 0.75);
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  // タイトルとスタッフエリアの区切り線（テーマカラー）
  doc.setDrawColor(...slotColor.divider);
  doc.setLineWidth(0.2);
  doc.line(x, y + titleH, x + w, y + titleH);

  // --- スタッフエリア（白背景） ---
  const cardBottom = y + rowH;
  let staffY = y + titleH + 0.3;

  if (splitBySide) {
    const halfW = w / 2;
    doc.setFillColor(...ISCT.monoQuinary);
    doc.rect(x, staffY, halfW, SIDE_HEADER_H, 'F');
    doc.rect(x + halfW, staffY, halfW, SIDE_HEADER_H, 'F');
    doc.setDrawColor(...slotColor.divider); doc.setLineWidth(0.2);
    doc.line(x + halfW, staffY, x + halfW, cardBottom);
    doc.line(x, staffY + SIDE_HEADER_H, x + w, staffY + SIDE_HEADER_H);
    doc.setFontSize(7); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(...ISCT.monoSecondary);
    doc.text('← 下手', x + halfW / 2, staffY + SIDE_HEADER_H * 0.72, { align: 'center' });
    doc.text('上手 →', x + halfW + halfW / 2, staffY + SIDE_HEADER_H * 0.72, { align: 'center' });
    const nameStartY = staffY + SIDE_HEADER_H;
    let sy = nameStartY;
    for (const nm of shimoteNames) {
      const drawnH = drawStaffRow(doc, nm, staffMap.get(nm), slot, x, sy, halfW, cardBottom);
      if (drawnH > 0) sy += drawnH;
      else break;
    }
    let ky = nameStartY;
    for (const nm of kamiteNames) {
      const drawnH = drawStaffRow(doc, nm, staffMap.get(nm), slot, x + halfW, ky, halfW, cardBottom);
      if (drawnH > 0) ky += drawnH;
      else break;
    }
  } else {
    let rowY = staffY;
    for (const nm of staffNames) {
      const drawnH = drawStaffRow(doc, nm, staffMap.get(nm), slot, x, rowY, w, cardBottom);
      if (drawnH > 0) rowY += drawnH;
      else break;
    }
    if (staffNames.length === 0) {
      doc.setFontSize(7); doc.setTextColor(...ISCT.monoSecondary);
      doc.text('（未配置）', x + 2, staffY + 3);
    }
  }

  return rowH;
}

// カラムヘッダーをY座標指定で描画（角ばったデザイン・時間帯テーマカラー）
function drawColumnHeaderAt(doc, slot, x, colW, slotPositions, staff, event, startY) {
  const slotColor = SLOT_COLORS[slot];
  const line1Y = startY + 3.2;
  const line2Y = startY + 6.8;

  // ヘッダー本体：時間帯テーマカラーの濃色・白文字（角ばった矩形）
  doc.setDrawColor(...slotColor.border); doc.setLineWidth(0.4); doc.setFillColor(...slotColor.border);
  doc.rect(x, startY, colW, COL_HEADER_H, 'FD');

  doc.setFontSize(9); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(255, 255, 255);
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
    doc.setFontSize(6); doc.setTextColor(255, 255, 255);
    doc.text(timeRange, x + 2.5, line2Y);
  }

  return startY + COL_HEADER_H + 1.5;
}

function drawColumns(doc, positions, staff, event, contentStartY) {
  const colW = getColWidth();
  const colStartY = contentStartY ?? (MARGIN + TITLE_H);
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

  // 連続リスト形式: 各スロットのポジションをページ分割し、
  // ページごとに外枠（角ばった矩形）＋区切り線で連続描画する

  // 各スロットのポジションを「ページ×リスト」に分割
  const slotPages = {}; // slotPages[slot] = [[pos, ...], [pos, ...], ...]
  TIME_SLOTS.forEach(slot => {
    const slotPositions = grouped[slot] || [];
    const pages = [];
    let currentPageCards = [];
    let currentY = colStartY + COL_HEADER_H + 1.5;

    slotPositions.forEach(pos => {
      const cardH = calcCardHeight(pos, staffMap);
      if (currentY + cardH > pageBottom && currentPageCards.length > 0) {
        pages.push(currentPageCards);
        currentPageCards = [];
        currentY = colStartY + COL_HEADER_H + 1.5;
      }
      currentPageCards.push(pos);
      currentY += cardH;
    });
    if (currentPageCards.length > 0 || pages.length === 0) {
      pages.push(currentPageCards);
    }
    slotPages[slot] = pages;
  });

  const maxPages = Math.max(...TIME_SLOTS.map(slot => slotPages[slot].length));

  let maxBottom = colStartY;

  for (let pageIdx = 0; pageIdx < maxPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage();

    TIME_SLOTS.forEach((slot, colIdx) => {
      const x = getColX(colIdx);
      const slotColor = SLOT_COLORS[slot];
      const slotPositions = grouped[slot] || [];
      const pageCards = slotPages[slot][pageIdx] || [];

      // ヘッダーは全ページで描画（角ばったデザイン）
      const contentTop = drawColumnHeaderAt(doc, slot, x, colW, slotPositions, staff, event, colStartY);

      if (pageCards.length === 0) {
        if (pageIdx === 0 && slotPositions.length === 0) {
          doc.setFontSize(7); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(...ISCT.monoSecondary);
          doc.text('ポジションがありません', x + colW / 2, contentTop + 4, { align: 'center' });
        }
        return;
      }

      // ページ内のリスト全体の高さを計算
      const listH = pageCards.reduce((sum, pos) => sum + calcCardHeight(pos, staffMap), 0);

      // 背景塗りのみ先に描画（枠線は最後に描画して要素に隠れないようにする）
      doc.setFillColor(255, 255, 255);
      doc.rect(x, contentTop, colW, listH, 'F');

      // ポジションを連続描画（余白なし・区切り線で分割）
      let rowY = contentTop;
      pageCards.forEach((pos, idx) => {
        const posH = drawPositionRow(doc, pos, x, rowY, colW, staffMap, slot, slotColor);
        // 次のポジションとの区切り線（最後は除く）
        if (idx < pageCards.length - 1) {
          doc.setDrawColor(...slotColor.divider);
          doc.setLineWidth(0.2);
          doc.line(x, rowY + posH, x + colW, rowY + posH);
        }
        rowY += posH;
      });

      // 外枠を最後に描画（要素に隠れず均一に見える）
      doc.setDrawColor(...slotColor.border);
      doc.setLineWidth(0.4);
      doc.rect(x, contentTop, colW, listH, 'S');

      maxBottom = Math.max(maxBottom, rowY);
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

// 貸出・返却 管理チェック表（紙ベース管理用）を描画
// スタッフ名のみ印字し、番号欄は空欄、チェック欄は空の四角枠で紙に直接書き込める前提
function drawCheckListSheet(doc, staff, event) {
  const sortedStaff = [...staff].sort(compareByOrder);
  if (sortedStaff.length === 0) return;

  const pageW = 210;
  const pageH = 297;
  const margin = 8;
  const titleH = 13;
  const headerH = 12;
  const rowH = 10;
  const pageBottom = pageH - margin;
  const tableW = pageW - 2 * margin;
  const checkboxSize = 5;

  // 列定義（group: パス/ペン/弁当の視覚グループ）
  const cols = [
    { key: 'no',         label: 'No',        w: 7,  group: 0 },
    { key: 'name',       label: 'スタッフ名',  w: 33, group: 0 },
    { key: 'passNo',     label: 'パス\nNo',    w: 20, group: 1 },
    { key: 'passLoan',   label: 'パス\n貸出',  w: 11, group: 1, type: 'check' },
    { key: 'passReturn', label: 'パス\n返却',  w: 11, group: 1, type: 'check' },
    { key: 'penNo',      label: 'ペン\nNo',    w: 20, group: 2 },
    { key: 'penLoan',    label: 'ペン\n貸出',  w: 11, group: 2, type: 'check' },
    { key: 'penReturn',  label: 'ペン\n返却',  w: 11, group: 2, type: 'check' },
    { key: 'bentoDay',   label: '昼\n弁当',    w: 11, group: 3, type: 'check' },
    { key: 'bentoNight', label: '夜\n弁当',    w: 11, group: 3, type: 'check' },
    { key: 'note',       label: '備考',       w: 0,  group: 0 },
  ];
  const fixedW = cols.slice(0, -1).reduce((s, c) => s + c.w, 0);
  cols[cols.length - 1].w = tableW - fixedW;

  // グループごとのヘッダー色
  const GROUP_COLORS = {
    0: { bg: [71, 85, 105],   border: [51, 65, 85]  }, // No/名前/備考 = スレート
    1: { bg: [194, 95, 28],   border: [154, 70, 18]  }, // パス = オレンジ
    2: { bg: [37, 99, 235],   border: [29, 78, 216]  }, // ペン = ブルー
    3: { bg: [22, 163, 74],   border: [21, 128, 61]  }, // 弁当 = グリーン
  };

  function drawHeader(y) {
    let x = margin;
    // グループごとに背景色を分けて描画
    doc.setLineWidth(0.3);
    let cx = x;
    cols.forEach((col, i) => {
      const c = GROUP_COLORS[col.group];
      doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
      doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
      doc.rect(cx, y, col.w, headerH, 'FD');
      cx += col.w;
    });
    // 外枠
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.35);
    doc.rect(x, y, tableW, headerH, 'S');

    // ヘッダーテキスト
    doc.setFontSize(7);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(255, 255, 255);
    let tx = x;
    cols.forEach(col => {
      const lines = col.label.split('\n');
      if (lines.length > 1) {
        doc.text(lines[0], tx + col.w / 2, y + 4.8, { align: 'center' });
        doc.text(lines[1], tx + col.w / 2, y + 9.5, { align: 'center' });
      } else {
        doc.text(col.label, tx + col.w / 2, y + 7.5, { align: 'center' });
      }
      tx += col.w;
    });
    return y + headerH;
  }

  function drawTitleRow(y) {
    doc.setFontSize(12);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(event?.name || '', margin, y + 5);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('貸出・返却 管理チェック表', margin, y + 10.5);

    let dateStr = '';
    if (event?.date) {
      const d = new Date(event.date);
      dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }
    const subText = [dateStr, event?.venue].filter(Boolean).join('　');
    if (subText) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(subText, pageW - margin, y + 5, { align: 'right' });
    }
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('※番号欄・備考欄は空欄です。直接筆記して使用してください。', pageW - margin, y + 10.5, { align: 'right' });
    return y + titleH;
  }

  // チェックボックス（空欄四角）をセル中央に描画
  function drawCheckbox(cx, cy) {
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.25);
    doc.rect(cx - checkboxSize / 2, cy - checkboxSize / 2, checkboxSize, checkboxSize, 'S');
  }

  // 新しいページ
  doc.addPage();
  let y = margin;
  y = drawTitleRow(y);
  y = drawHeader(y);

  doc.setFontSize(8);
  doc.setFont('NotoSansJP', 'normal');

  sortedStaff.forEach((s, idx) => {
    if (y + rowH > pageBottom) {
      doc.addPage();
      y = margin;
      y = drawHeader(y);
      doc.setFontSize(8);
      doc.setFont('NotoSansJP', 'normal');
    }

    const x = margin;

    // 交互縞
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(x, y, tableW, rowH, 'F');
    }

    // 行枠線
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.rect(x, y, tableW, rowH, 'S');

    // 縦線（グループ境界は太く）
    let cx = x;
    let prevGroup = cols[0].group;
    cols.forEach((col, i) => {
      cx += col.w;
      if (cx < x + tableW) {
        const nextCol = cols[i + 1];
        if (nextCol && nextCol.group !== col.group) {
          doc.setLineWidth(0.4);
          doc.setDrawColor(100, 116, 139);
        } else {
          doc.setLineWidth(0.2);
          doc.setDrawColor(203, 213, 225);
        }
        doc.line(cx, y, cx, y + rowH);
      }
    });

    let cellX = x;

    // No
    doc.setTextColor(100, 116, 139);
    doc.text(String(idx + 1), cellX + cols[0].w / 2, y + rowH * 0.62, { align: 'center' });
    cellX += cols[0].w;

    // スタッフ名
    doc.setTextColor(15, 23, 42);
    let name = s.name || '';
    const nameMaxW = cols[1].w - 2;
    while (name.length > 1 && doc.getTextWidth(name) > nameMaxW) name = name.slice(0, -1);
    if (name !== (s.name || '') && name.length > 0) name = name.slice(0, -1) + '…';
    doc.text(name, cellX + 1.5, y + rowH * 0.62);
    cellX += cols[1].w;

    // パスNo（空欄）
    cellX += cols[2].w;
    // パス貸出
    drawCheckbox(cellX + cols[3].w / 2, y + rowH / 2);
    cellX += cols[3].w;
    // パス返却
    drawCheckbox(cellX + cols[4].w / 2, y + rowH / 2);
    cellX += cols[4].w;

    // ペンNo（空欄）
    cellX += cols[5].w;
    // ペン貸出
    drawCheckbox(cellX + cols[6].w / 2, y + rowH / 2);
    cellX += cols[6].w;
    // ペン返却
    drawCheckbox(cellX + cols[7].w / 2, y + rowH / 2);
    cellX += cols[7].w;

    // 昼弁当
    drawCheckbox(cellX + cols[8].w / 2, y + rowH / 2);
    cellX += cols[8].w;
    // 夜弁当
    drawCheckbox(cellX + cols[9].w / 2, y + rowH / 2);
    cellX += cols[9].w;

    // 備考（空欄）
    y += rowH;
  });
}

export async function generatePositionPDF(data, filename) {
  const { jsPDF } = await import('jspdf');
  const { bizud: bizudFontBase64, full: fullFontBase64, medium: mediumFontBase64 } = await loadJapaneseFont();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // フォント登録
  // BIZ UDゴシック使用時は単体で環境依存文字を網羅するため、'NotoSansJP' ファミリ名で BIZ UD を登録し
  // フォント切替（髙判別）をスキップ。取得失敗時や USE_BIZ_UD_FONT=false の場合は従来の Noto 構成へフォールバック。
  const hasBizUd = USE_BIZ_UD_FONT && Boolean(bizudFontBase64);
  const hasMedium = Boolean(mediumFontBase64);
  const hasFull = Boolean(fullFontBase64);
  let fullFontName = null;
  if (hasBizUd) {
    doc.addFileToVFS('BIZUDGothic-Bold.ttf', bizudFontBase64);
    doc.addFont('BIZUDGothic-Bold.ttf', 'NotoSansJP', 'normal');
  } else {
    if (hasMedium) {
      doc.addFileToVFS('NotoSansJPM.ttf', mediumFontBase64);
      doc.addFont('NotoSansJPM.ttf', 'NotoSansJP', 'normal');
    } else if (hasFull) {
      doc.addFileToVFS('NotoSansJPFull.ttf', fullFontBase64);
      doc.addFont('NotoSansJPFull.ttf', 'NotoSansJP', 'normal');
    }
    // NotoSansJPFull: フルカバレッジ(400・髙対応)。Medium をデフォルトにする場合のみ別名登録し、髙含みテキストに使用。
    fullFontName = hasFull && hasMedium ? 'NotoSansJPFull' : null;
    if (fullFontName) {
      doc.addFileToVFS('NotoSansJPFull.ttf', fullFontBase64);
      doc.addFont('NotoSansJPFull.ttf', fullFontName, 'normal');
    }
  }

  // JIS第1・第2水準外の文字（髙・﨑・CJK互換漢字・拡張Aなど）はフルカバレッジフォントへフォールバック
  function needsFullFont(text) {
    if (!text) return false;
    const s = String(text);
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c === 0x9AD9) return true;                        // 髙
      if (c >= 0xF900 && c <= 0xFAFF) return true;           // CJK互換漢字（﨑 U+FA11 等）
      if (c >= 0x3400 && c <= 0x4DBF) return true;           // CJK拡張A
      if (c >= 0xFE30 && c <= 0xFE4F) return true;          // CJK互換形式
    }
    return false;
  }
  function selectFontForText(text) {
    if (fullFontName && needsFullFont(text)) {
      doc.setFont(fullFontName, 'normal'); // フルカバレッジ(400)
    } else {
      doc.setFont('NotoSansJP', 'normal'); // Medium(500)
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
    const event = data.event || {};
    // 複数公演モード: 部ごとにページを分けて出力（1ページ=1部の配置表）
    const multiShow = Boolean(event.multi_show_mode) && (event.show_count || 1) > 1;
    if (multiShow) {
      const partsCount = Math.max(1, event.show_count || 1);
      for (let part = 1; part <= partsCount; part++) {
        if (part > 1) doc.addPage();
        // 部別時刻（show_times）を優先し、未設定の項目はイベント共通の時刻で補完
        const st = event.show_times?.[String(part)] || {};
        const partEvent = {
          ...event,
          time_open: st.time_open ?? event.time_open,
          time_open_end: st.time_open_end ?? event.time_open_end,
          time_start: st.time_start ?? event.time_start,
          time_start_end: st.time_start_end ?? event.time_start_end,
          time_end: st.time_end ?? event.time_end,
        };
        const partPositions = (data.positions || []).filter((p) => getParts(p).includes(part));
        const headerY = drawReportHeader(doc, partEvent, `${part}部`);
        drawColumns(doc, partPositions, data.staff || [], partEvent, headerY);
      }
    } else {
      const headerY = drawReportHeader(doc, event);
      drawColumns(doc, data.positions || [], data.staff || [], event, headerY);
    }

    // 配置表の2枚目以降: 貸出・返却 管理チェック表（紙ベース管理用）
    if (data.type === 'staff') {
      drawCheckListSheet(doc, data.staff || [], event);
    }
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ---- 配置表マップPDF ----

// 画像ソース（SVG data URI / 画像URL）をPNG data URIに変換（jsPDF addImage用）
function imageToPngDataUri(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 2200;
      const w0 = img.naturalWidth || 1200;
      const h0 = img.naturalHeight || 800;
      const scale = Math.min(1, maxDim / Math.max(w0, h0));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w0 * scale));
      canvas.height = Math.max(1, Math.round(h0 * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      try {
        resolve({ dataUri: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('マップ画像の読み込みに失敗しました'));
    img.src = src;
  });
}

function mapStaffListOf(pos) {
  if (pos?.split_by_side) {
    return [...(pos.staff_names_kamite || []), ...(pos.staff_names_shimote || [])];
  }
  return pos?.staff_names || [];
}

function drawPinLabel(doc, cx, cy, name, staff, pageMinX, pageMaxX) {
  doc.setFontSize(6);
  const staffText = staff.length ? staff.join('・') : '';
  const nameW = doc.getTextWidth(name);
  const staffW = staffText ? doc.getTextWidth(staffText) : 0;
  const padX = 1.2;
  const padY = 0.5;
  const lineH = 3.0;
  const boxW = Math.max(nameW, staffW) + padX * 2;
  const boxH = (staffText ? lineH * 2 : lineH) + padY * 2;
  let boxX = cx + 1.8;
  if (boxX + boxW > pageMaxX) boxX = cx - 1.8 - boxW;
  if (boxX < pageMinX) boxX = pageMinX;
  const boxY = cy - boxH / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(28, 49, 119);
  doc.setLineWidth(0.2);
  doc.roundedRect(boxX, boxY, boxW, boxH, 0.6, 0.6, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.text(name, boxX + padX, boxY + padY + 2.1);
  if (staffText) {
    doc.setFontSize(5);
    doc.setTextColor(71, 85, 105);
    let t = staffText;
    const maxW = boxW - padX * 2;
    while (t.length > 1 && doc.getTextWidth(t) > maxW) t = t.slice(0, -1);
    if (t !== staffText && t.length > 0) t = t.slice(0, -1) + '…';
    doc.text(t, boxX + padX, boxY + padY + lineH + 2.1);
    doc.setFontSize(6);
  }
}

// 配置表マップPDF: 会場マップ画像＋ピン（ポジション名・担当スタッフ）を出力
export async function generateMapPDF(data, filename) {
  const { jsPDF } = await import('jspdf');
  const { bizud: bizudFontBase64, full: fullFontBase64, medium: mediumFontBase64 } = await loadJapaneseFont();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // フォント登録（generatePositionPDFと同等）
  const hasBizUd = USE_BIZ_UD_FONT && Boolean(bizudFontBase64);
  const hasMedium = Boolean(mediumFontBase64);
  const hasFull = Boolean(fullFontBase64);
  let fullFontName = null;
  if (hasBizUd) {
    doc.addFileToVFS('BIZUDGothic-Bold.ttf', bizudFontBase64);
    doc.addFont('BIZUDGothic-Bold.ttf', 'NotoSansJP', 'normal');
  } else {
    if (hasMedium) {
      doc.addFileToVFS('NotoSansJPM.ttf', mediumFontBase64);
      doc.addFont('NotoSansJPM.ttf', 'NotoSansJP', 'normal');
    } else if (hasFull) {
      doc.addFileToVFS('NotoSansJPFull.ttf', fullFontBase64);
      doc.addFont('NotoSansJPFull.ttf', 'NotoSansJP', 'normal');
    }
    fullFontName = hasFull && hasMedium ? 'NotoSansJPFull' : null;
    if (fullFontName) {
      doc.addFileToVFS('NotoSansJPFull.ttf', fullFontBase64);
      doc.addFont('NotoSansJPFull.ttf', fullFontName, 'normal');
    }
  }
  function needsFullFont(text) {
    if (!text) return false;
    const s = String(text);
    for (const ch of s) {
      const c = ch.codePointAt(0);
      if (c === 0x9AD9) return true;
      if (c >= 0xF900 && c <= 0xFAFF) return true;
      if (c >= 0x3400 && c <= 0x4DBF) return true;
      if (c >= 0xFE30 && c <= 0xFE4F) return true;
    }
    return false;
  }
  function selectFontForText(text) {
    if (fullFontName && needsFullFont(text)) doc.setFont(fullFontName, 'normal');
    else doc.setFont('NotoSansJP', 'normal');
  }
  const origText = doc.text.bind(doc);
  doc.text = function (text, x, y, options) { selectFontForText(text); return origText(text, x, y, options); };
  const origGetTextWidth = doc.getTextWidth.bind(doc);
  doc.getTextWidth = function (text) { selectFontForText(text); return origGetTextWidth(text); };

  const pageW = 297, pageH = 210, margin = 8;
  const event = data.event || {};

  // タイトル
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(event.name || '配置表マップ', margin, margin + 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const dateStr = event.date
    ? (() => { const d = new Date(event.date); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; })()
    : '';
  const sub = [dateStr, event.venue].filter(Boolean).join('　');
  if (sub) doc.text(sub, pageW - margin, margin + 4, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('配置表マップ', margin, margin + 9);
  doc.setTextColor(0, 0, 0);

  const topY = margin + 13;
  const availW = pageW - 2 * margin;
  const availH = pageH - topY - margin;

  if (!data.mapImage) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('会場マップが未登録です', pageW / 2, topY + availH / 2, { align: 'center' });
    doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
    return;
  }

  const { dataUri: png, width: iw, height: ih } = await imageToPngDataUri(data.mapImage);
  const ratio = Math.min(availW / iw, availH / ih);
  const drawW = iw * ratio;
  const drawH = ih * ratio;
  const imgX = margin + (availW - drawW) / 2;
  const imgY = topY + (availH - drawH) / 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(imgX - 1, imgY - 1, drawW + 2, drawH + 2, 'FD');
  doc.addImage(png, 'PNG', imgX, imgY, drawW, drawH);

  const positions = data.positions || [];
  const staffByName = {};
  positions.forEach((p) => {
    (staffByName[p.name] ||= []).push(...mapStaffListOf(p));
  });
  const pins = data.pins || [];
  pins.forEach((pin) => {
    if (pin.map_x == null || pin.map_y == null) return;
    const cx = imgX + (pin.map_x / 100) * drawW;
    const cy = imgY + (pin.map_y / 100) * drawH;
    const staff = Array.from(new Set(staffByName[pin.position_name] || []));
    drawPinLabel(doc, cx, cy, pin.position_name, staff, margin, pageW - margin);
    doc.setFillColor(28, 49, 119);
    doc.circle(cx, cy, 1.3, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, 1.3, 'S');
  });

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}