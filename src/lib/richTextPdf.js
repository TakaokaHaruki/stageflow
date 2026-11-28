// react-quill の HTML 出力を PDF 描画用の「行×ラン」構造へ変換し、
// 幅に合わせて折り返し描画する。改行・フォントカラーを反映する。

const DEFAULT_COLOR = [26, 26, 26];

const colorCache = new Map();
function cssColorToRgb(css) {
  if (!css) return null;
  if (colorCache.has(css)) return colorCache.get(css);
  let rgb = null;
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    const v = ctx.fillStyle;
    if (v && v[0] === "#") {
      rgb = [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
    } else {
      const m = String(v).match(/rgba?\(([^)]+)\)/i);
      if (m) {
        const p = m[1].split(",").map(Number);
        rgb = [p[0] || 0, p[1] || 0, p[2] || 0];
      }
    }
  } catch (e) {
    rgb = null;
  }
  colorCache.set(css, rgb);
  return rgb;
}

function styleColor(el) {
  const st = el.getAttribute && el.getAttribute("style");
  if (!st) return null;
  const m = st.match(/(^|;)\s*color\s*:\s*([^;]+)/i);
  return m ? cssColorToRgb(m[2].trim()) : null;
}

// HTML → 行配列（各行は run の配列 [{text, color}]）
export function htmlToLines(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(`<div id="rt">${html}</div>`, "text/html");
  const root = doc.getElementById("rt");
  const lines = [];
  let cur = [];
  const push = () => { if (cur.length) { lines.push(cur); cur = []; } };
  const BLOCK = new Set(["p", "div", "li", "h1", "h2", "h3", "h4", "h5", "blockquote", "tr", "section"]);
  function walk(node, color) {
    node.childNodes.forEach((ch) => {
      if (ch.nodeType === 3) {
        const t = ch.textContent;
        if (t) cur.push({ text: t, color });
      } else if (ch.nodeType === 1) {
        const el = ch;
        const tag = el.tagName.toLowerCase();
        const c = styleColor(el) || color;
        if (tag === "br") { push(); return; }
        if (BLOCK.has(tag)) {
          if (cur.length) push();
          walk(el, c);
          push();
          return;
        }
        walk(el, c);
      }
    });
  }
  walk(root, DEFAULT_COLOR);
  push();
  return lines;
}

// 指定幅に合わせて折り返し描画し、描画終了Yを返す
export function drawRichText(doc, html, x, y, w, lineHeight) {
  const lines = htmlToLines(html);
  let cy = y;
  for (const line of lines) {
    let seg = [];
    let segW = 0;
    const flush = () => {
      let sx = x;
      for (const r of seg) {
        const col = r.color || DEFAULT_COLOR;
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(r.text, sx, cy);
        sx += doc.getTextWidth(r.text);
      }
      seg = [];
      segW = 0;
      cy += lineHeight;
    };
    for (const run of line) {
      const col = run.color || DEFAULT_COLOR;
      const chars = Array.from(run.text);
      for (const ch of chars) {
        if (ch === "\n") { flush(); continue; }
        const cw = doc.getTextWidth(ch);
        if (segW + cw > w && seg.length) flush();
        const last = seg[seg.length - 1];
        if (last && last.color === col) last.text += ch;
        else seg.push({ text: ch, color: col });
        segW += cw;
      }
    }
    flush();
  }
  return cy;
}

// 描画高さを概算（ページ分割判定用）
export function estimateRichTextHeight(doc, html, w, lineHeight) {
  const lines = htmlToLines(html);
  let count = 0;
  for (const line of lines) {
    let wacc = 0;
    for (const run of line) {
      for (const ch of Array.from(run.text)) {
        if (ch === "\n") { count++; wacc = 0; continue; }
        const cw = doc.getTextWidth(ch);
        if (wacc + cw > w && wacc > 0) { count++; wacc = 0; }
        wacc += cw;
      }
    }
    count++;
  }
  return Math.max(1, count) * lineHeight;
}