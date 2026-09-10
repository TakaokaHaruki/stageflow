import { base44 } from "@/api/base44Client";

/**
 * アクセスログのCSVをダウンロードする（管理者用バックエンド関数経由）。
 * target: "access"（アクセス履歴）| "view"（閲覧操作）
 * 戻り値: 出力件数
 */
export async function downloadLogCsv({ target, dateFrom, dateTo }) {
  const res = await base44.functions.invoke("exportAccessLogsCsv", {
    target,
    date_from: dateFrom || "",
    date_to: dateTo || "",
  });
  const { csv, count } = res.data || {};
  if (!csv) throw new Error("CSV data is empty");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const period =
    dateFrom || dateTo ? `${dateFrom || "開始日なし"}〜${dateTo || "最新"}` : "全期間";
  a.href = url;
  a.download = `${target === "access" ? "アクセス履歴" : "閲覧操作"}_${period}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return count;
}