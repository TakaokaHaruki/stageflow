import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// 表示中の配置表マップ（画像＋ピン）をPDF化する
export async function exportMapToPDF(element, { title, subtitle } = {}) {
  const canvas = await html2canvas(element, {
    useCORS: true,
    backgroundColor: "#ffffff",
    scale: 2,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let top = 28;
  if (title) {
    pdf.setFontSize(14);
    pdf.text(title, 28, top);
    top += 18;
  }
  if (subtitle) {
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    pdf.text(subtitle, 28, top);
    top += 16;
    pdf.setTextColor(0, 0, 0);
  }
  const availW = pageW - 56;
  const availH = pageH - top - 28;
  const ratio = Math.min(availW / canvas.width, availH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  const left = (pageW - w) / 2;
  pdf.addImage(imgData, "PNG", left, top, w, h);
  const safeName = (title || "配置表マップ").replace(/[\\/:*?"<>|]/g, "");
  pdf.save(`${safeName}.pdf`);
}