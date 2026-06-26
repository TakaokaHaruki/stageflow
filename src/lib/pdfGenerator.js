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

// UI配置表の色（Tailwind → RGB）
const SLOT_COLORS = {
  '開場中': {
    headerBg: [253, 230, 138],   // amber-200
    headerText: [69, 26, 3],      // amber-950
    border: [251, 191, 36],       // amber-400
  },
  '開演中': {
    headerBg: [191, 219, 254],   // blue-200
    headerText: [23, 37, 84],     // blue-950
    border: [96, 165, 250],       // blue-400
  },
  '終演後': {
    headerBg: [203, 213, 225],   // slate-300
    headerText: [15, 23, 42],     // slate-900
    border: [148, 163, 184],      // slate-400
  },
};

const SLOT_NOTE_KEY = { '開場中': 'note_before', '開演中': 'note_during', '終演後': 'note_after' };

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 8;
const COL_GAP = 4;
const CARD_GAP = 2;
const TITLE_H = 16;
const COL_HEADER_H = 7;
const NAME_BAR_H = 6;

function getColWidth() {
  return (PAGE_W - 2 * MARGIN - 2 * COL_GAP) / 3;
}

function getColX(index) {
  return MARGIN + index * (getColWidth() + COL_GAP);
}

const STAFF_FONT_SIZE = 9;
const STAFF_LINE_H = STAFF_FONT_SIZE * 0.353 * 1.3;

function drawTitle(doc, event) {
  doc.setFontSize(12);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(event.name || '', MARGIN, MARGIN + 6);

  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
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

  // 名前（色付き）
  doc.setFontSize(STAFF_FONT_SIZE);
  doc.setFont('NotoSansJP', 'normal');
  const nameColor = staffData?.color;
  if (nameColor) {
    const [r, g, b] = hexToRgb(nameColor);
    doc.setTextColor(r, g, b);
  } else {
    doc.setTextColor(15, 23, 42);
  }
  doc.text(name, x, y + STAFF_LINE_H * 0.75);

  let cursorX = x + doc.getTextWidth(name) + 1.5;

  // 備考マーカー（amber "!"）
  const slotNoteKey = SLOT_NOTE_KEY[slot];
  const slotNote = slotNoteKey ? staffData?.[slotNoteKey] : null;
  const displayNote = slotNote || staffData?.note;
  if (displayNote && cursorX + 2 < x + w) {
    doc.setTextColor(245, 158, 11);
    doc.text('!', cursorX, y + STAFF_LINE_H * 0.75);
    cursorX += 3;
  }

  // 着替バッジ（purple）
  if (staffData?.costume_change && cursorX + 8 < x + w) {
    doc.setFontSize(6);
    const badgeText = '着替';
    const badgeW = doc.getTextWidth(badgeText) + 2;
    doc.setFillColor(243, 232, 255);
    doc.setDrawColor(216, 180, 254);
    doc.setLineWidth(0.2);
    doc.roundedRect(cursorX, y + 0.8, badgeW, 3.2, 0.5, 0.5, 'FD');
    doc.setTextColor(126, 34, 206);
    doc.text(badgeText, cursorX + 1, y + 3);
    cursorX += badgeW + 1;
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  // 休憩バッジ（sky）
  if (staffData?.break && cursorX + 8 < x + w) {
    doc.setFontSize(6);
    const badgeText = '休憩';
    const badgeW = doc.getTextWidth(badgeText) + 2;
    doc.setFillColor(224, 242, 254);
    doc.setDrawColor(125, 211, 252);
    doc.setLineWidth(0.2);
    doc.roundedRect(cursorX, y + 0.8, badgeW, 3.2, 0.5, 0.5, 'FD');
    doc.setTextColor(3, 105, 161);
    doc.text(badgeText, cursorX + 1, y + 3);
    cursorX += badgeW + 1;
    doc.setFontSize(STAFF_FONT_SIZE);
  }

  return true;
}

function drawCard(doc, pos, x, y, w, cardH, staffMap, slot) {
  const splitBySide = Boolean(pos.split_by_side);
  const kamiteNames = splitBySide ? (pos.staff_names_kamite || []) : [];
  const shimoteNames = splitBySide ? (pos.staff_names_shimote || []) : [];
  const staffNames = splitBySide
    ? [...new Set([...kamiteNames, ...shimoteNames])]
    : (pos.staff_names || []);

  const assignedCount = staffNames.length;
  const requiredCount = pos.required_count || 0;

  // カード本体: 白背景・枠線・角丸
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, cardH, 1.5, 1.5, 'FD');

  // ヘッダーバー: muted/20背景
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y, w, NAME_BAR_H + 1, 1.5, 1.5, 'F');
  doc.rect(x, y + NAME_BAR_H - 1, w, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(x, y + NAME_BAR_H, x + w, y + NAME_BAR_H);

  // カラードット
  const [r, g, b] = hexToRgb(pos.color || '#6366f1');
  doc.setFillColor(r, g, b);
  doc.circle(x + 3, y + 3, 1.2, 'F');

  // ポジション名
  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(15, 23, 42);
  let name = pos.name || '';
  const maxNameW = w - 24;
  while (doc.getTextWidth(name) > maxNameW && name.length > 1) {
    name = name.slice(0, -1);
  }
  if (name !== (pos.name || '') && name.length > 0) name = name.slice(0, -1) + '…';
  doc.text(name, x + 6, y + 3.8);

  // 人数表示
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const countText = requiredCount > 0 ? `${assignedCount}/${requiredCount}名` : `${assignedCount}名`;
  doc.text(countText, x + w - 3, y + 3.8, { align: 'right' });

  // ステータスバッジ
  if (requiredCount > 0) {
    const diff = requiredCount - assignedCount;
    let badgeLabel, badgeBg, badgeBorder, badgeText;
    if (diff > 0) {
      badgeLabel = `残${diff}`;
      badgeBg = [254, 243, 199]; badgeBorder = [252, 211, 77]; badgeText = [120, 53, 15];
    } else if (diff === 0) {
      badgeLabel = '充足';
      badgeBg = [220, 252, 231]; badgeBorder = [134, 239, 172]; badgeText = [22, 101, 52];
    } else {
      badgeLabel = `超過${Math.abs(diff)}`;
      badgeBg = [254, 226, 226]; badgeBorder = [252, 165, 165]; badgeText = [153, 27, 27];
    }
    doc.setFontSize(7);
    const badgeTextW = doc.getTextWidth(badgeLabel);
    const badgeTotalW = badgeTextW + 3;
    const countTextW = doc.getTextWidth(countText);
    const badgeX = x + w - 3 - countTextW - badgeTotalW - 2;
    const badgeY = y + 1.5;
    const badgeH = 4;
    doc.setFillColor(...badgeBg);
    doc.setDrawColor(...badgeBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(badgeX, badgeY, badgeTotalW, badgeH, 0.5, 0.5, 'FD');
    doc.setTextColor(...badgeText);
    doc.text(badgeLabel, badgeX + 1.5, badgeY + 2.8);
  }

  // スタッフエリア
  const staffY = y + NAME_BAR_H;
  const cardBottom = y + cardH;

  if (splitBySide) {
    const halfW = w / 2;
    const sideHeaderH = 4;

    // 上手・下手ヘッダー
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
    const nameStartY = staffY;
    let rowY = nameStartY;
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
}

function drawColumns(doc, positions, staff) {
  const colW = getColWidth();
  const colStartY = MARGIN + TITLE_H + 4;
  const availableColH = PAGE_H - MARGIN - colStartY - COL_HEADER_H - 1;

  // スタッフ検索マップ
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

  let maxBottom = colStartY;

  TIME_SLOTS.forEach((slot, i) => {
    const x = getColX(i);
    const slotPositions = grouped[slot] || [];
    const numCards = slotPositions.length;
    const maxCardH = numCards > 0
      ? (availableColH - (numCards - 1) * CARD_GAP) / numCards
      : availableColH;

    const colors = SLOT_COLORS[slot];

    // カラム枠（色付き2pxボーダー）
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, colStartY, colW, availableColH + COL_HEADER_H + 1, 2, 2, 'FD');

    // カラムヘッダー（スロット色背景）
    doc.setFillColor(...colors.headerBg);
    doc.roundedRect(x, colStartY, colW, COL_HEADER_H + 1, 2, 2, 'F');
    doc.rect(x, colStartY + COL_HEADER_H - 1, colW, 2, 'F');
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.5);
    doc.line(x, colStartY + COL_HEADER_H, x + colW, colStartY + COL_HEADER_H);

    // ヘッダーテキスト
    doc.setFontSize(10);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(...colors.headerText);
    doc.text(slot, x + 3, colStartY + 4.8);

    // 件数・設定人数・配置人数
    doc.setFontSize(7);
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
    doc.text(infoText, x + colW - 3, colStartY + 4.8, { align: 'right' });

    let cardY = colStartY + COL_HEADER_H + 1;

    if (numCards === 0) {
      doc.setFontSize(8);
      doc.setFont('NotoSansJP', 'normal');
      doc.setTextColor(153, 153, 153);
      doc.text('ポジションがありません', x + colW / 2, cardY + 6, { align: 'center' });
      maxBottom = Math.max(maxBottom, cardY + 10);
      return;
    }

    slotPositions.forEach(pos => {
      drawCard(doc, pos, x, cardY, colW, maxCardH, staffMap, slot);
      cardY += maxCardH + CARD_GAP;
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

  // セクション枠（amber）
  doc.setDrawColor(252, 211, 77);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN, y, sectionW, 10, 1.5, 1.5, 'FD');

  // ヘッダー（amber-50）
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

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
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