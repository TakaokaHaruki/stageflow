// URLをシンク（href / window.open / img.src 等）へ渡す前の安全検証。
// https/http/blob のみ許可し、javascript: / data: / vbscript: 等の危険なスキームを拒否する。
// blob: は同一オリジン scoped のブラウザ生成URLでJSを実行できず、生成PDFのプレビュー等で使用する。
export function isSafeHttpUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "blob:";
  } catch {
    return false;
  }
}