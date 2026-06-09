import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * 共通戻るボタン
 * ヘッダー内の一番左端に配置することを想定。
 * to: 遷移先パス
 * label: スクリーンリーダー用ラベル（省略可）
 */
export default function BackButton({ to, label = "戻る" }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
      aria-label={label}
    >
      <ArrowLeft className="w-5 h-5" />
    </Link>
  );
}