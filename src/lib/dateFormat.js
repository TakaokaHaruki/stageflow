import { format } from "date-fns";
import { ja } from "date-fns/locale";

/**
 * 日本語の統一日付表記フォーマッタ（例: 9月5日（土））
 */
export function formatJaDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "M月d日（E）", { locale: ja });
}