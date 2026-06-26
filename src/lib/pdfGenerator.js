let cachedFontBase64 = null;

async function loadJapaneseFont() {
  if (cachedFontBase64) return cachedFontBase64;
  const urls = [
    'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.ttf',
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
  '開場中': {
    headerBg: [253, 230, 138],
    headerText: [69, 26, 3],
    border: [251, 191, 36],
  },
  '開演中': {
    headerBg: [191, 219, 254],
    headerText: [23, 37, 84],
    border: [96, 165, 250],
  },
  '終演後': {
    headerBg: [203, 213, 225],
    headerText: [15, 23, 42],
    border: [148, 163, 184],
  },
};

const SLOT_NOTE_KEY = { '開場中': 'note_before', '開演中': 'note_during', '終演後': 'note_after' };

// A4縦
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 8;
const COL_GAP = 4;
const CARD_GAP = 2;
const TITLE_H = 16;
const COL_HEADER_H = 7;
const CARD_HEADER_H = 7;
const STAFF_FONT_SIZE = 8;
const STAFF_LINE_H = 4.8;
const CARD_PADDING_BOTTOM = 2;

function getColWidth() {
  return (PAGE_W - 2 * MARGIN - 2 * COL_GAP) / 3;
}

function getColX(index) {
  return MARGIN + index * (getColWidth() + COL_GAP);
}

function drawTitle(doc, event) {
  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(event.name || '', MARGIN, MARGIN + 6);

  doc.setFontSize(9);
  let dateStr = '';
  if (event.date) {
    const d = new Date(event.date);
    dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  }
  const subText = `${dateStr}${event.venue ? '　' + event.venue : ''}`;
  if (subText) doc.text(subText, MARGIN, MARGIN + 12);
}

function drawStaffRow(doc, name, staffData, slot, x, y, w, cardBottom) {
  if (y + STAFF_LINE_H > cardBottom - 0.5) return false;

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

  let cursorX = x + doc.getTextWidth(name) + 1.5;

  const slotNoteKey = SLOT_NOTE_KEY[slot];
  const slotNote = slotNoteKey ? staffData?.[slotNoteKey] : null;
  const displayNote = slotNote || staffData?.note;
  if (displayNote && cursorX + 2 < x + w) {
    doc.setTextColor(245, 158, 11);
    doc.text('!', cursorX, textY);
    cursorX += 3;
  }

  const badgeTop = y + 0.6;
  const badgeH = STAFF_LINE_H - 1.2;
  const badgeTextY = badgeTop + badgeH * 0.72;

  if (staffData?.costume_change && cursorX + 8 < x + w) {
    doc.setFontSize(6);
    const badgeText = '着替';
    const badgeW = doc.getTextWidth(badgeText) + 2;
    doc.setFillColor(243, 232, 255);
    doc.setDrawColor(216, 180, 254);
    doc.setLineWidth(0.2);
    doc.roundedRect(cursorX, badgeTop, badgeW, badgeH, 0.5, 0.5, 'FD');
    doc.setTextColor(126, 34, 206);
    doc.text(badgeText, cursorX + 1, badgeTextY);
    cursorX += badgeW + 1;
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  if (staffData?.break && cursorX + 8 < x + w) {
    doc.setFontSize(6);
    const badgeText = '休憩';
    const badgeW = doc.getTextWidth(badgeText) + 2;
    doc.setFillColor(224, 242, 254);
    doc.setDrawColor(125, 211, 252);
    doc.setLineWidth(0.2);
    doc.roundedRect(cursorX, badgeTop, badgeW, badgeH, 0.5, 0.5, 'FD');
    doc.setTextColor(3, 105, 161);
    doc.text(badgeText, cursorX + 1, badgeTextY);
    cursorX += badgeW + 1;
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  return true;
}

function calcCardHeight(pos) {
  const splitBySide = Boolean(pos.split_by_side);
  const staffCount = splitBySide
    ? Math.max(
        (pos.staff_names_kamite || []).length,
        (pos.staff_names_shimote || []).length
      )
    : (pos.staff_names || []).length;
  const sideHeaderH = splitBySide ? 4 : 0;
  return CARD_HEADER_H + sideHeaderH + (staffCount > 0 ? staffCount * STAFF_LINE_H : STAFF_LINE_H) + CARD_PADDING_BOTTOM;
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

  // カード本体
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, cardH, 1.5, 1.5, 'FD');

  // ヘッダーバー
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y, w, CARD_HEADER_H, 1.5, 1.5, 'F');
  doc.rect(x, y + CARD_HEADER_H - 1.5, w, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(x, y + CARD_HEADER_H, x + w, y + CARD_HEADER_H);

  const headerTextY = y + CARD_HEADER_H * 0.68;

  // カラードット
  const [r, g, b] = hexToRgb(pos.color || '#6366f1');
  doc.setFillColor(r, g, b);
  doc.circle(x + 2.8, y + CARD_HEADER_H / 2, 1.2, 'F');

  // 人数表示（右端）
  doc.setFontSize(7);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(100, 116, 139);
  const countText = requiredCount > 0 ? `${assignedCount}/${requiredCount}名` : `${assignedCount}名`;
  doc.text(countText, x + w - 2, headerTextY, { align: 'right' });
  const countTextW = doc.getTextWidth(countText);

  // ポジション名
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  let posName = pos.name || '';
  const maxNameW = x + w - 2 - countTextW - 2 - (x + 6);
  while (maxNameW > 0 && doc.getTextWidth(posName) > maxNameW && posName.length > 1) {
    posName = posName.slice(0, -1);
  }
  if (posName !== (pos.name || '') && posName.length > 0) posName = posName.slice(0, -1) + '…';
  doc.text(posName, x + 6, headerTextY);

  // スタッフエリア
  const staffY = y + CARD_HEADER_H + 0.5;
  const cardBottom = y + cardH;

  if (splitBySide) {
    const halfW = w / 2;
    const sideHeaderH = 4;

    doc.setFillColor(248, 250, 252);
    doc.rect(x, staffY, halfW, sideHeaderH, 'F');
    doc.rect(x + halfW, staffY, halfW, sideHeaderH, 'F');

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(x + halfW, staffY, x + halfW, cardBottom);
    doc.line(x, staffY + sideHeaderH, x + w, staffY + sideHeaderH);

    doc.setFontSize(7);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('上手', x + halfW / 2, staffY + 2.8, { align: 'center' });
    doc.text('下手', x + halfW + halfW / 2, staffY + 2.8, { align: 'center' });

    const nameStartY = staffY + sideHeaderH;
    let kamiteY = nameStartY;
    for (const nm of kamiteNames) {
      if (drawStaffRow(doc, nm, staffMap.get(nm), slot, x + 2, kamiteY, halfW - 2, cardBottom)) {
        kamiteY += STAFF_LINE_H;
      } else break;
    }
    let shimoteY = nameStartY;
    for (const nm of shimoteNames) {
      if (drawStaffRow(doc, nm, staffMap.get(nm), slot, x + halfW + 2, shimoteY, halfW - 2, cardBottom)) {
        shimoteY += STAFF_LINE_H;
      } else break;
    }
  } else {
    let rowY = staffY + 0.5;
    for (const nm of staffNames) {
      if (drawStaffRow(doc, nm, staffMap.get(nm), slot, x + 3, rowY, w - 3, cardBottom)) {
        rowY += STAFF_LINE_H;
      } else break;
    }
    if (staffNames.length === 0) {
      doc.setFontSize(8);
      doc.setTextColor(153, 153, 153);
      doc.text('（未配置）', x + 3, staffY + 4);
    }
  }

  return cardH;
}

function drawColumnHeader(doc, slot, x, colW, slotPositions, staff) {
  const colors = SLOT_COLORS[slot];
  const colHeaderBottom = MARGIN + TITLE_H + 4 + COL_HEADER_H;
  const colHeaderTextY = MARGIN + TITLE_H + 4 + COL_HEADER_H * 0.72;

  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, MARGIN + TITLE_H + 4, colW, COL_HEADER_H, 2, 2, 'FD');

  doc.setFillColor(...colors.headerBg);
  doc.roundedRect(x, MARGIN + TITLE_H + 4, colW, COL_HEADER_H, 2, 2, 'F');
  doc.rect(x, MARGIN + TITLE_H + 4 + COL_HEADER_H - 2, colW, 2, 'F');
  doc.setDrawColor(...colors.border);
  doc.setLineWidth(0.5);
  doc.line(x, colHeaderBottom, x + colW, colHeaderBottom);

  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(...colors.headerText);
  doc.text(slot, x + 3, colHeaderTextY);

  doc.setFontSize(7);
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
  doc.text(infoText, x + colW - 3, colHeaderTextY, { align: 'right' });

  return colHeaderBottom + 2;
}

function drawColumns(doc, positions, staff) {
  const colW = getColWidth();
  const colStartY = MARGIN + TITLE_H + 4;
  const colContentStartY = colStartY + COL_HEADER_H + 2;
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

  // 各スロットのカードを描画（ページ送り対応）
  let maxBottom = colContentStartY;

  TIME_SLOTS.forEach((slot, i) => {
    const x = getColX(i);
    const slotPositions = grouped[slot] || [];

    // カラムヘッダーは各ページの先頭に描画
    let cardY = drawColumnHeader(doc, slot, x, colW, slotPositions, staff);

    if (slotPositions.length === 0) {
      doc.setFontSize(8);
      doc.setFont('NotoSansJP', 'normal');
      doc.setTextColor(153, 153, 153);
      doc.text('ポジションがありません', x + colW / 2, cardY + 6, { align: 'center' });
      maxBottom = Math.max(maxBottom, cardY + 10);
      return;
    }

    slotPositions.forEach(pos => {
      const cardH = calcCardHeight(pos);
      // ページに収まらない場合は次ページへ
      if (cardY + cardH > pageBottom) {
        doc.addPage();
        cardY = drawColumnHeader(doc, slot, x, colW, slotPositions, staff);
      }
      drawCard(doc, pos, x, cardY, colW, staffMap, slot);
      cardY += cardH + CARD_GAP;
    });

    maxBottom = Math.max(maxBottom, cardY - CARD_GAP);
  });

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

  let y = startY + 4;
  if (y + 15 > PAGE_H - MARGIN) {
    doc.addPage();
    y = MARGIN + 4;
  }

  const sectionW = PAGE_W - 2 * MARGIN;

  doc.setDrawColor(252, 211, 77);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN, y, sectionW, 10, 1.5, 1.5, 'FD');

  doc.setFillColor(255, 251, 235);
  doc.roundedRect(MARGIN, y, sectionW, 5, 1.5, 1.5, 'F');
  doc.rect(MARGIN, y + 3.5, sectionW, 1.5, 'F');
  doc.setDrawColor(252, 211, 77);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y + 5, MARGIN + sectionW, y + 5);

  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(120, 53, 15);
  doc.text(`未配置スタッフ（${unassigned.length}名）`, MARGIN + 3, y + 3.5);

  y += 6;
  doc.setFontSize(8);
  doc.setFont('NotoSansJP', 'normal');
  let ux = MARGIN + 2;
  unassigned.forEach(s => {
    const nameW = doc.getTextWidth(s.name) + 4;
    if (ux + nameW > PAGE_W - MARGIN - 2) {
      ux = MARGIN + 2;
      y += 5;
    }
    doc.setDrawColor(253, 230, 138);
    doc.setFillColor(255, 251, 235);
    doc.setLineWidth(0.2);
    doc.roundedRect(ux, y - 3.5, nameW, 4.5, 0.5, 0.5, 'FD');
    doc.setTextColor(15, 23, 42);
    doc.text(s.name, ux + 2, y - 0.5);
    ux += nameW + 2;
  });
}

function drawTimelineTable(doc, positions, staff) {
  const sortedStaff = [...staff].sort(compareByOrder);
  const sortedPositions = [...positions].sort(compareByOrder);

  const timeline = {};
  sortedStaff.forEach(s => {
    timeline[s.name] = { '開場中': [], '開演中': [], '終演後': [] };
  });
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
  doc.setFontSize(10);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  ['スタッフ名', '開場中', '開演中', '終演後'].forEach((label, i) => {
    doc.text(label, MARGIN + i * colW + colW / 2, y + 5.5, { align: 'center' });
  });
  doc.setDrawColor(187, 187, 187);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, rowH, 'S');
  y += rowH;

  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  Object.entries(timeline).forEach(([name, slots]) => {
    if (y + rowH > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }

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

    doc.setDrawColor(187, 187, 187);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, rowH, 'S');
    for (let i = 1; i < 4; i++) {
      doc.line(MARGIN + i * colW, y, MARGIN + i * colW, y + rowH);
    }
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
    const columnsBottom = drawColumns(doc, data.positions || [], data.staff || []);
    drawUnassigned(doc, data.positions || [], data.staff || [], columnsBottom);
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}