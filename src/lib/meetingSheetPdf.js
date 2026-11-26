import { loadJapaneseFont, buildPdfFilename } from "@/lib/pdfGenerator";
import { TIME_FIELDS, TIME_NOTE_FIELD, MEETING_SECTIONS } from "@/lib/meetingSheetSections";

// A4縦・ミーティング用紙PDF出力
// 配置表PDFの帳票デザインを踏襲しつつ、ベタ塗を廃して印刷インクを抑えたISCT準拠レイアウト。
// 入力済みの各項目を2段組みで見開き風にレイアウトし、日本語フォントで描画する。
export async function generateMeetingSheetPDF(sheet) {
  const { jsPDF } = await import("jspdf");
  const { bizud, full, medium } = await loadJapaneseFont();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // フォント登録（配置表PDFと同等）
  const hasBizUd = Boolean(bizud);
  const hasMedium = Boolean(medium);
  const hasFull = Boolean(full);
  let fullFontName = null;
  if (hasBizUd) {
    doc.addFileToVFS("BIZUDGothic-Bold.ttf", bizud);
    doc.addFont("BIZUDGothic-Bold.ttf", "NotoSansJP", "normal");
  } else {
    if (hasMedium) {
      doc.addFileToVFS("NotoSansJPM.ttf", medium);
      doc.addFont("NotoSansJPM.ttf", "NotoSansJP", "normal");
    } else if (hasFull) {
      doc.addFileToVFS("NotoSansJPFull.ttf", full);
      doc.addFont("NotoSansJPFull.ttf", "NotoSansJP", "normal");
    }
    fullFontName = hasFull && hasMedium ? "NotoSansJPFull" : null;
    if (fullFontName) {
      doc.addFileToVFS("NotoSansJPFull.ttf", full);
      doc.addFont("NotoSansJPFull.ttf", fullFontName, "normal");
    }
  }

  function needsFullFont(text) {
    if (!text) return false;
    for (const ch of String(text)) {
      const c = ch.codePointAt(0);
      if (c === 0x9ad9) return true;
      if (c >= 0xf900 && c <= 0xfaff) return true;
      if (c >= 0x3400 && c <= 0x4dbf) return true;
      if (c >= 0xfe30 && c <= 0xfe4f) return true;
    }
    return false;
  }
  function selectFontForText(text) {
    if (fullFontName && needsFullFont(text)) doc.setFont(fullFontName, "normal");
    else doc.setFont("NotoSansJP", "normal");
  }
  const origText = doc.text.bind(doc);
  doc.text = function (text, x, y, options) {
    selectFontForText(text);
    return origText(text, x, y, options);
  };
  const origGetWidth = doc.getTextWidth.bind(doc);
  doc.getTextWidth = function (text) {
    selectFontForText(text);
    return origGetWidth(text);
  };

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 8;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const COL_GAP = 4;
  const colW = (CONTENT_W - COL_GAP) / 2;
  const PAGE_BOTTOM = PAGE_H - MARGIN;

  const ISCT = {
    primary: [28, 49, 120],
    monoPrimary: [26, 26, 26],
    monoSecondary: [118, 118, 118],
    monoTertiary: [204, 204, 204],
  };

  function formatDate(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
  }

  // 帳票風ヘッダー（配置表PDFと共通デザイン）
  function drawHeader() {
    const y = MARGIN;
    doc.setFontSize(13);
    doc.setTextColor(...ISCT.monoPrimary);
    doc.text(sheet.event_name || sheet.title || "ミーティング用紙", MARGIN, y + 4.5);
    doc.setFontSize(11);
    doc.setTextColor(...ISCT.primary);
    doc.text(sheet.title || "ミーティング用紙", PAGE_W - MARGIN, y + 4.5, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(...ISCT.monoSecondary);
    const sub = [sheet.event_date ? formatDate(sheet.event_date) : "", sheet.venue].filter(Boolean).join("　");
    if (sub) doc.text(sub, MARGIN, y + 8.5);
    doc.setDrawColor(...ISCT.primary);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10);
    return y + 14;
  }

  // セクションブロック: 見出し下線＋本文枠のみ（ベタ塗なし・インクセーブ）
  function drawSectionBlock(x, y, w, sec) {
    // 見出し（下線のみ）
    doc.setDrawColor(...ISCT.primary);
    doc.setLineWidth(0.4);
    doc.line(x, y + 4.5, x + w, y + 4.5);
    doc.setFontSize(8.5);
    doc.setTextColor(...ISCT.primary);
    doc.text(sec.label, x + 1, y + 3.2);
    y += 5;
    // 本文（枠のみ・背景塗りなし）
    doc.setFontSize(7.5);
    doc.setTextColor(...ISCT.monoPrimary);
    const lines = doc.splitTextToSize(sec.value, w - 4);
    const bodyH = Math.max(8, lines.length * 4 + 3);
    doc.setDrawColor(...ISCT.monoTertiary);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, bodyH, "S");
    let ly = y + 4;
    lines.forEach((ln) => {
      doc.text(ln, x + 2, ly);
      ly += 4;
    });
    return 5 + bodyH;
  }

  let y = drawHeader();

  // タイムスケジュール
  const timeEntries = TIME_FIELDS.map((f) => ({ label: f.label, value: sheet[f.key] || "" })).filter((e) => e.value);
  if (timeEntries.length > 0 || sheet[TIME_NOTE_FIELD.key]) {
    doc.setFontSize(9);
    doc.setTextColor(...ISCT.primary);
    doc.text("タイムスケジュール", MARGIN, y + 3);
    doc.setDrawColor(...ISCT.primary);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 4, PAGE_W - MARGIN, y + 4);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(...ISCT.monoPrimary);
    let tx = MARGIN + 1;
    timeEntries.forEach((e) => {
      const text = `${e.label}: ${e.value}`;
      const w = doc.getTextWidth(text) + 2;
      if (tx + w > PAGE_W - MARGIN - 1) return;
      doc.text(text, tx, y + 3);
      tx += w;
    });
    y += 5;
    if (sheet[TIME_NOTE_FIELD.key]) {
      doc.setFontSize(7);
      doc.setTextColor(...ISCT.monoSecondary);
      const noteLines = doc.splitTextToSize(String(sheet[TIME_NOTE_FIELD.key]), CONTENT_W - 4);
      const noteH = noteLines.length * 4 + 2;
      doc.setDrawColor(...ISCT.monoTertiary);
      doc.setLineWidth(0.15);
      doc.rect(MARGIN, y, CONTENT_W, noteH, "S");
      let ny = y + 4;
      noteLines.forEach((ln) => {
        doc.text(ln, MARGIN + 2, ny);
        ny += 4;
      });
      y += noteH + 2;
    }
    y += 2;
  }

  // 本文セクションを2段組みで流し込み（ページ超過時は改ページしてヘッダー再描画）
  const sections = MEETING_SECTIONS.map((s) => ({ label: s.label, value: sheet[s.key] || "" })).filter((s) => s.value);
  let leftY = y;
  let rightY = y;
  sections.forEach((sec) => {
    doc.setFontSize(7.5);
    const estBodyH = Math.max(8, doc.splitTextToSize(sec.value, colW - 4).length * 4 + 3);
    const estH = 5 + estBodyH;
    const measureY = Math.min(leftY, rightY);
    if (measureY + estH > PAGE_BOTTOM) {
      doc.addPage();
      leftY = drawHeader() + 2;
      rightY = leftY;
    }
    const useLeft = leftY <= rightY;
    const startX = useLeft ? MARGIN : MARGIN + colW + COL_GAP;
    const startY = useLeft ? leftY : rightY;
    const blockH = drawSectionBlock(startX, startY, colW, sec);
    if (useLeft) leftY += blockH + 2;
    else rightY += blockH + 2;
  });

  doc.save(`${buildPdfFilename(sheet.event_name, "ミーティング用紙", sheet.event_date)}.pdf`);
}