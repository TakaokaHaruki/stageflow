import { loadJapaneseFont, buildPdfFilename } from "@/lib/pdfGenerator";
import { TIME_FIELDS, TIME_NOTE_FIELD, resolveSections } from "@/lib/meetingSheetSections";
import { drawRichText, estimateRichTextHeight } from "@/lib/richTextPdf";

// A4縦・ミーティング用紙PDF出力
// 配置表PDFの帳票デザインを踏襲しつつ、ベタ塗を廃して印刷インクを抑えたISCT準拠レイアウト。
// チーフ・クローク欄＋横一列のタイムスケジュール表＋本文セクション（リッチテキスト対応・1pt小）。
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
  doc.text = function (text, x, y, options) { selectFontForText(text); return origText(text, x, y, options); };
  const origGetWidth = doc.getTextWidth.bind(doc);
  doc.getTextWidth = function (text) { selectFontForText(text); return origGetWidth(text); };

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 8;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const COL_GAP = 4;
  const colW = (CONTENT_W - COL_GAP) / 2;
  const PAGE_BOTTOM = PAGE_H - MARGIN;

  const ISCT = {
    primary: [28, 49, 120],
    primaryLight: [207, 219, 237],
    quaternary: [249, 251, 255],
    monoPrimary: [26, 26, 26],
    monoSecondary: [118, 118, 118],
    monoTertiary: [204, 204, 204],
  };

  // 本文フォント：従来より1pt小さく（7.5 → 6.5）
  const BODY_FONT = 6.5;
  const BODY_LINE_H = 3.4;
  const LABEL_FONT = 7.5;

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

  // チーフ・クローク欄（配置表PDFと共通デザイン・ベタ塗なしでインクセーブ）
  function drawChiefCloak(y) {
    const halfW = CONTENT_W / 2;
    const labelW = 18;
    const h = 6.5;
    // 枠のみ
    doc.setDrawColor(...ISCT.monoTertiary);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, y, halfW, h, "S");
    doc.rect(MARGIN + halfW, y, halfW, h, "S");
    // ラベル部（淡色枠内）
    doc.setFillColor(...ISCT.primaryLight);
    doc.rect(MARGIN, y, labelW, h, "F");
    doc.rect(MARGIN + halfW, y, labelW, h, "F");
    doc.setDrawColor(...ISCT.primary);
    doc.setLineWidth(0.2);
    doc.line(MARGIN + labelW, y, MARGIN + labelW, y + h);
    doc.line(MARGIN + halfW + labelW, y, MARGIN + halfW + labelW, y + h);
    doc.setFontSize(7);
    doc.setTextColor(...ISCT.primary);
    doc.text("チーフ", MARGIN + labelW / 2, y + h / 2, { align: "center", baseline: "middle" });
    doc.text("クローク", MARGIN + halfW + labelW / 2, y + h / 2, { align: "center", baseline: "middle" });
    doc.setFontSize(9);
    doc.setTextColor(...ISCT.monoPrimary);
    doc.text(sheet.chief_name || "", MARGIN + labelW + 1.5, y + h / 2, { baseline: "middle" });
    doc.text(sheet.cloak_name || "", MARGIN + halfW + labelW + 1.5, y + h / 2, { baseline: "middle" });
    return y + h + 2;
  }

  // タイムスケジュール：横一列表形式
  function drawTimeTable(y) {
    doc.setFontSize(9);
    doc.setTextColor(...ISCT.primary);
    doc.text("タイムスケジュール", MARGIN, y + 3);
    doc.setDrawColor(...ISCT.primary);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + 4, PAGE_W - MARGIN, y + 4);
    y += 5;

    const cols = TIME_FIELDS;
    const colWidth = CONTENT_W / cols.length;
    const labelH = 5;
    const valueH = 6;
    // ラベル行
    doc.setDrawColor(...ISCT.monoTertiary);
    doc.setLineWidth(0.2);
    cols.forEach((f, i) => {
      const x = MARGIN + i * colWidth;
      doc.setFillColor(...ISCT.quaternary);
      doc.rect(x, y, colWidth, labelH, "FD");
      doc.setFontSize(LABEL_FONT - 0.5);
      doc.setTextColor(...ISCT.primary);
      doc.text(f.label, x + colWidth / 2, y + labelH * 0.68, { align: "center" });
    });
    // 値行
    const vy = y + labelH;
    cols.forEach((f, i) => {
      const x = MARGIN + i * colWidth;
      doc.setFillColor(255, 255, 255);
      doc.rect(x, vy, colWidth, valueH, "F");
      doc.setDrawColor(...ISCT.monoTertiary);
      doc.setLineWidth(0.2);
      doc.rect(x, vy, colWidth, valueH, "S");
      doc.setFontSize(8);
      doc.setTextColor(...ISCT.monoPrimary);
      const val = sheet[f.key] || "";
      let txt = val;
      while (txt.length > 1 && doc.getTextWidth(txt) > colWidth - 2) txt = txt.slice(0, -1);
      if (txt !== val && txt.length > 0) txt = txt.slice(0, -1) + "…";
      doc.text(txt, x + colWidth / 2, vy + valueH * 0.66, { align: "center" });
    });
    y = vy + valueH + 2;

    if (sheet[TIME_NOTE_FIELD.key]) {
      doc.setFontSize(7);
      doc.setTextColor(...ISCT.monoSecondary);
      const noteLines = doc.splitTextToSize(String(sheet[TIME_NOTE_FIELD.key]), CONTENT_W - 4);
      const noteH = noteLines.length * 3.4 + 2;
      doc.setDrawColor(...ISCT.monoTertiary);
      doc.setLineWidth(0.15);
      doc.rect(MARGIN, y, CONTENT_W, noteH, "S");
      let ny = y + 3;
      noteLines.forEach((ln) => { doc.text(ln, MARGIN + 2, ny); ny += 3.4; });
      y += noteH + 2;
    }
    return y + 2;
  }

  // セクションブロック: 見出し下線＋本文枠のみ（ベタ塗なし）
  function drawSectionBlock(x, y, w, sec) {
    // 見出し（下線のみ）
    doc.setDrawColor(...ISCT.primary);
    doc.setLineWidth(0.4);
    doc.line(x, y + 4.2, x + w, y + 4.2);
    doc.setFontSize(LABEL_FONT);
    doc.setTextColor(...ISCT.primary);
    let label = sec.label || "項目";
    while (label.length > 1 && doc.getTextWidth(label) > w - 2) label = label.slice(0, -1);
    if (label !== (sec.label || "項目") && label.length > 0) label = label.slice(0, -1) + "…";
    doc.text(label, x + 1, y + 3);
    y += 5;

    // 本文高さ概算
    const innerW = w - 4;
    const estH = estimateRichTextHeight(doc, sec.content, innerW, BODY_LINE_H);
    const bodyH = Math.max(8, estH + 4);
    doc.setDrawColor(...ISCT.monoTertiary);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, bodyH, "S");
    doc.setFontSize(BODY_FONT);
    drawRichText(doc, sec.content, x + 2, y + 3, innerW, BODY_LINE_H);
    return 5 + bodyH;
  }

  let y = drawHeader();
  y = drawChiefCloak(y);
  y = drawTimeTable(y);

  // 本文セクション（2段組み・ページ超過で改ページ）
  const sections = resolveSections(sheet);
  let leftY = y;
  let rightY = y;
  sections.forEach((sec) => {
    const innerW = colW - 4;
    const estH = 5 + Math.max(8, estimateRichTextHeight(doc, sec.content, innerW, BODY_LINE_H) + 4);
    const measureY = Math.min(leftY, rightY);
    if (measureY + estH > PAGE_BOTTOM) {
      doc.addPage();
      const hy = drawHeader();
      const ny = drawChiefCloak(hy);
      const ty = drawTimeTable(ny);
      leftY = ty;
      rightY = ty;
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