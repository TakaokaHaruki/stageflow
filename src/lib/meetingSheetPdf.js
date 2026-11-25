import { loadJapaneseFont } from "@/lib/pdfGenerator";
import { TIME_FIELDS, TIME_NOTE_FIELD, MEETING_SECTIONS } from "@/lib/meetingSheetSections";

// A4縦・ミーティング用紙PDF出力
// 入力済みの各項目を2段組みで見開き風にレイアウトし、日本語フォントで描画する
export async function generateMeetingSheetPDF(sheet, filename) {
  const { jsPDF } = await import("jspdf");
  const { bizud, full, medium } = await loadJapaneseFont();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

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

  const ISCT = {
    primary: [28, 49, 120],
    primaryText: [255, 255, 255],
    monoPrimary: [26, 26, 26],
    monoSecondary: [118, 118, 118],
    monoTertiary: [204, 204, 204],
    monoQuinary: [250, 250, 250],
  };

  // ヘッダー
  let y = MARGIN;
  doc.setFillColor(...ISCT.primary);
  doc.rect(MARGIN, y, CONTENT_W, 14, "F");
  doc.setFontSize(13);
  doc.setTextColor(...ISCT.primaryText);
  doc.text(sheet.title || "ミーティング用紙", MARGIN + 3, y + 6.5);
  doc.setFontSize(8);
  doc.setTextColor(207, 219, 237);
  const headerRight = [sheet.event_name, sheet.venue].filter(Boolean).join("　");
  if (headerRight) doc.text(headerRight, PAGE_W - MARGIN - 3, y + 6.5, { align: "right" });
  if (sheet.event_date) {
    const d = new Date(sheet.event_date);
    const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    doc.text(dateStr, PAGE_W - MARGIN - 3, y + 11, { align: "right" });
  }
  y += 14;

  // タイムスケジュール
  const timeEntries = TIME_FIELDS.map((f) => ({
    label: f.label,
    value: sheet[f.key] || "",
  })).filter((e) => e.value);
  if (timeEntries.length > 0 || sheet[TIME_NOTE_FIELD.key]) {
    doc.setDrawColor(...ISCT.primary);
    doc.setLineWidth(0.3);
    doc.setFillColor(...ISCT.primary);
    doc.rect(MARGIN, y, CONTENT_W, 5.5, "F");
    doc.setFontSize(9);
    doc.setTextColor(...ISCT.primaryText);
    doc.text("タイムスケジュール", MARGIN + 2, y + 3.8);
    y += 5.5;
    doc.setDrawColor(...ISCT.monoTertiary);
    doc.setLineWidth(0.2);
    doc.setFillColor(255, 255, 255);
    doc.rect(MARGIN, y, CONTENT_W, 6, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...ISCT.monoPrimary);
    let tx = MARGIN + 2;
    timeEntries.forEach((e) => {
      const text = `${e.label}: ${e.value}`;
      const w = doc.getTextWidth(text) + 2;
      if (tx + w > PAGE_W - MARGIN - 2) return;
      doc.text(text, tx, y + 4);
      tx += w;
    });
    y += 6;
    if (sheet[TIME_NOTE_FIELD.key]) {
      doc.setFontSize(7);
      doc.setTextColor(...ISCT.monoSecondary);
      const noteLines = doc.splitTextToSize(String(sheet[TIME_NOTE_FIELD.key]), CONTENT_W - 4);
      const noteH = noteLines.length * 4 + 2;
      doc.rect(MARGIN, y, CONTENT_W, noteH, "FD");
      doc.text(noteLines, MARGIN + 2, y + 4);
      y += noteH;
    }
  }

  y += 2;

  // 本文セクションを2段組みで流し込み
  const sections = MEETING_SECTIONS.map((s) => ({
    label: s.label,
    value: sheet[s.key] || "",
  })).filter((s) => s.value);

  function drawSectionBlock(doc, sec, x, y, w) {
    doc.setFillColor(...ISCT.primary);
    doc.rect(x, y, w, 5, "F");
    doc.setFontSize(8);
    doc.setTextColor(...ISCT.primaryText);
    doc.text(sec.label, x + 1.5, y + 3.4);
    y += 5;
    doc.setFontSize(7.5);
    doc.setTextColor(...ISCT.monoPrimary);
    const lines = doc.splitTextToSize(sec.value, w - 4);
    const bodyH = Math.max(6, lines.length * 4 + 3);
    doc.setDrawColor(...ISCT.monoTertiary);
    doc.setLineWidth(0.2);
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, bodyH, "FD");
    let ly = y + 4;
    lines.forEach((ln) => {
      doc.text(ln, x + 2, ly);
      ly += 4;
    });
    return 5 + bodyH;
  }

  // 左右の列の現在Yを追跡し、短い方に次のブロックを追加
  let leftY = y;
  let rightY = y;
  sections.forEach((sec) => {
    const measureY = Math.min(leftY, rightY);
    const isLeft = leftY <= rightY;
    const x = isLeft ? MARGIN : MARGIN + colW + COL_GAP;
    const blockH = drawSectionBlock(doc, sec, x, measureY, colW);
    if (isLeft) leftY += blockH + 2;
    else rightY += blockH + 2;
  });

  const finalY = Math.max(leftY, rightY);
  if (finalY > PAGE_H - MARGIN - 6) {
    // 1ページに収まらない場合は2ページ目へ（簡易対応）
    doc.addPage();
    const overflow = sections.slice(Math.ceil(sections.length / 2));
    let oy = MARGIN;
    overflow.forEach((sec) => {
      const h = drawSectionBlock(doc, sec, MARGIN, oy, CONTENT_W);
      oy += h + 2;
    });
  }

  const safeName = (filename || "meeting_sheet").replace(/[\\/:*?"<>|]/g, "_");
  doc.save(`${safeName}_${new Date().toISOString().split("T")[0]}.pdf`);
}