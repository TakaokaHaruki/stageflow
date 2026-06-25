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
const SLOT_STYLES = {
  '開場中': { bg: [229, 229, 229], border: [85, 85, 85] },
  '開演中': { bg: [200, 200, 200], border: [34, 34, 34] },
  '終演後': { bg: [255, 255, 255], border: [136, 136, 136] },
};

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 8;
const COL_GAP = 4;
const CARD_GAP = 2;
const TITLE_H = 16;
const COL_HEADER_H = 6;
const NAME_BAR_H = 5;

function getColWidth() {
  return (PAGE_W - 2 * MARGIN - 2 * COL_GAP) / 3;
}

function getColX(index) {
  return MARGIN + index * (getColWidth() + COL_GAP);
}

function calcFontSize(maxStaffCount, availableTextH) {
  const fontSizes = [10, 9, 8, 7, 6, 5, 4];
  for (const fs of fontSizes) {
    const lineH = fs * 0.353 * 1.3;
    if (maxStaffCount * lineH <= availableTextH) return fs;
  }
  return 4;
}

function drawTitle(doc, event) {
  doc.setFontSize(16);
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

function drawCard(doc, pos, x, y, w, cardH) {
  const splitBySide = Boolean(pos.split_by_side);
  const kamiteNames = splitBySide ? (pos.staff_names_kamite || []) : [];
  const shimoteNames = splitBySide ? (pos.staff_names_shimote || []) : [];
  const staffNames = splitBySide
    ? [...new Set([...kamiteNames, ...shimoteNames])]
    : (pos.staff_names || []);

  const maxStaffCount = splitBySide
    ? Math.max(kamiteNames.length, shimoteNames.length)
    : staffNames.length;

  const availableTextH = cardH - NAME_BAR_H - 2;
  const fontSize = calcFontSize(maxStaffCount, availableTextH);
  const lineH = fontSize * 0.353 * 1.3;

  doc.setDrawColor(170, 170, 170);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, cardH, 1, 1, 'S');

  doc.setFillColor(245, 245, 245);
  doc.rect(x, y, w, NAME_BAR_H, 'F');
  doc.setDrawColor(204, 204, 204);
  doc.setLineWidth(0.2);
  doc.line(x, y + NAME_BAR_H, x + w, y + NAME_BAR_H);

  const [r, g, b] = hexToRgb(pos.color || '#6366f1');
  doc.setFillColor(r, g, b);
  doc.setDrawColor(51, 51, 51);
  doc.setLineWidth(0.1);
  doc.circle(x + 3, y + 2.5, 1.2, 'F');

  doc.setFontSize(11);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  let name = pos.name || '';
  const maxNameW = w - 8;
  while (doc.getTextWidth(name) > maxNameW && name.length > 1) {
    name = name.slice(0, -1);
  }
  if (name !== (pos.name || '')) name = name.slice(0, -1) + '…';
  doc.text(name, x + 6, y + 3.5);

  const staffY = y + NAME_BAR_H;

  if (splitBySide) {
    const halfW = w / 2;
    doc.setDrawColor(221, 221, 221);
    doc.setLineWidth(0.2);
    doc.line(x + halfW, staffY, x + halfW, y + cardH);

    const sides = [
      { label: '上手', names: kamiteNames, sx: x },
      { label: '下手', names: shimoteNames, sx: x + halfW },
    ];
    sides.forEach(side => {
      doc.setFillColor(245, 245, 245);
      doc.rect(side.sx, staffY, halfW, 3.5, 'F');
      doc.setFontSize(8);
      doc.setFont('NotoSansJP', 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(side.label, side.sx + halfW / 2, staffY + 2.5, { align: 'center' });

      doc.setFontSize(fontSize);
      doc.setFont('NotoSansJP', 'normal');
      doc.setTextColor(0, 0, 0);
      side.names.forEach((nm, ni) => {
        const ny = staffY + 3.5 + 1 + ni * lineH;
        if (ny < y + cardH - 0.5) doc.text(nm, side.sx + 2, ny);
      });
    });
  } else {
    doc.setFontSize(fontSize);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(0, 0, 0);
    staffNames.forEach((nm, ni) => {
      const ny = staffY + 2 + ni * lineH;
      if (ny < y + cardH - 0.5) doc.text(nm, x + 3, ny);
    });
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

    const style = SLOT_STYLES[slot];
    doc.setFillColor(...style.bg);
    doc.setDrawColor(...style.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, colStartY, colW, COL_HEADER_H, 1, 1, 'F');

    doc.setFontSize(13);
    doc.setFont('NotoSansJP', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(slot, x + 3, colStartY + 4.2);

    doc.setFontSize(8);
    doc.setFont('NotoSansJP', 'normal');
    doc.text(`${numCards}件`, x + colW - 3, colStartY + 4.2, { align: 'right' });

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
      drawCard(doc, pos, x, cardY, colW, maxCardH);
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

  doc.setFontSize(13);
  doc.setFont('NotoSansJP', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`未配置スタッフ（${unassigned.length}名）`, MARGIN, y);

  y += 5;
  doc.setFontSize(9);
  doc.setFont('NotoSansJP', 'normal');
  let ux = MARGIN;
  unassigned.forEach(s => {
    const nameW = doc.getTextWidth(s.name) + 4;
    if (ux + nameW > PAGE_W - MARGIN) {
      ux = MARGIN;
      y += 5;
    }
    doc.setDrawColor(204, 204, 204);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(ux, y - 3.5, nameW, 4.5, 0.5, 0.5, 'S');
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
  doc.setFontSize(12);
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