let cachedFontBase64 = null;

async function loadJapaneseFont() {
  if (cachedFontBase64) return cachedFontBase64;
  // 環境依存文字・拡張漢字（崎・髙・濵 等）対応：Noto Sans JP 完全グリフカバレッジ（可変TTF・jsPDFはデフォルトインスタンスを描画）
  // フォールバック：fontsource Noto Sans JP japanese サブセット（JIS第1・第2水準・従来動作）
  const urls = [
    'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf',
    'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.1.0/files/noto-sans-jp-japanese-400-normal.ttf',
  ];
  let lastError;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      cachedFontBase64 = btoa(binary);
      return cachedFontBase64;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error('フォントの読み込みに失敗しました: ' + (lastError?.message || ''));
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

// A4縦・コンパクト設定
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 5;
const COL_GAP = 2.5;
const CARD_GAP = 1.2;
const TITLE_H = 12;
const COL_HEADER_H = 6;
const CARD_HEADER_H = 5.5;
const STAFF_FONT_SIZE = 7;
const STAFF_LINE_H = 3.8;
const CARD_PADDING_V = 1;   // スタッフエリア上下パディング合計
const SIDE_HEADER_H = 3.5;

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
  return CARD_HEADER_H + extraH + (staffCount > 0 ? staffCount * STAFF_LINE_H : STAFF_LINE_H) + CARD_PADDING_V;
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

  doc.setFontSize(STAFF_FONT_SIZE);
  doc.setFont('NotoSansJP', 'normal');
  const nameColor = staffData?.color;
  if (nameColor) {
    const [r, g, b] = hexToRgb(nameColor);
    doc.setTextColor(r, g, b);
  } else {
    doc.setTextColor(15, 23, 42);
  }
  doc.text(name, x, textY);

  let cursorX = x + doc.getTextWidth(name) + 1;

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

  const staffY = y + CARD_HEADER_H + 0.3;
  const cardBottom = y + cardH;

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
function drawColumnHeaderAt(doc, slot, x, colW, slotPositions, staff, startY) {
  const colors = SLOT_COLORS[slot];
  const colHeaderTextY = startY + COL_HEADER_H * 0.72;

  doc.setDrawColor(...colors.border); doc.setLineWidth(0.4); doc.setFillColor(...colors.headerBg);
  doc.roundedRect(x, startY, colW, COL_HEADER_H, 1.5, 1.5, 'FD');

  doc.setFontSize(9); doc.setFont('NotoSansJP', 'normal'); doc.setTextColor(...colors.headerText);
  doc.text(slot, x + 2.5, colHeaderTextY);

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
  doc.text(infoText, x + colW - 2, colHeaderTextY, { align: 'right' });

  return startY + COL_HEADER_H + 1.5;
}

function drawColumns(doc, positions, staff) {
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
      let cardY = drawColumnHeaderAt(doc, slot, x, colW, slotPositions, staff, colStartY);

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
  const fontBase64 = await loadJapaneseFont();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addFileToVFS('NotoSansJP.ttf', fontBase64);
  doc.addFont('NotoSansJP.ttf', 'NotoSansJP', 'normal');
  doc.setFont('NotoSansJP');

  if (data.type === 'timeline') {
    drawTimelineTable(doc, data.positions || [], data.staff || []);
  } else {
    drawTitle(doc, data.event || {});
    drawColumns(doc, data.positions || [], data.staff || []);
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}