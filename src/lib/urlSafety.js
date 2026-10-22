// URLをシンク（href / window.open / img.src 等）へ渡す前の安全検証。
// https/http のみ許可し、javascript: / data: / vbscript: 等の危険なスキームを拒否する。
export function isSafeHttpUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}