import { Camera, RefreshCw, Smartphone, Chrome, Settings } from "lucide-react";
import { motion } from "framer-motion";

/**
 * ブラウザ・OS別のカメラ許可手順を案内するガイド
 * @param {function} onRetry - 再試行ボタン押下時のコールバック
 */
export default function CameraPermissionGuide({ onRetry }) {
  // ブラウザ/OSの判定
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua) || (/iPhone|iPad|iPod/i.test(ua) && /safari/i.test(ua) && !/crios/i.test(ua));
  const isChrome = /chrome|crios/i.test(ua) && !/edg/i.test(ua);

  let steps = [];
  let Icon = Settings;

  if (isIOS && isSafari) {
    Icon = Smartphone;
    steps = [
      "アドレスバー左の「AA」または「aA」ボタンをタップ",
      "「〇〇の設定」をタップ",
      "「カメラ」を「許可」に変更",
      "この画面を閉じて再度QR読取を開く",
    ];
  } else if (isAndroid && isChrome) {
    Icon = Chrome;
    steps = [
      "アドレスバー右の🔒（鍵）アイコンをタップ",
      "「権限」＞「カメラ」をタップ",
      "「許可」を選択",
      "ページを再読み込みして再度QR読取を開く",
    ];
  } else if (isAndroid) {
    Icon = Smartphone;
    steps = [
      "ブラウザの設定 ＞ サイトの権限 ＞ カメラ",
      "このサイトのカメラアクセスを「許可」に変更",
      "ページを再読み込みして再度QR読取を開く",
    ];
  } else {
    Icon = Camera;
    steps = [
      "アドレスバーの🔒（鍵）アイコンをクリック",
      "「カメラ」権限を「許可」に変更",
      "ページを再読み込みして再度QR読取を開く",
    ];
  }

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center overflow-y-auto py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-12 h-12 rounded-full bg-destructive/15 flex items-center justify-center mb-3 shrink-0">
        <Camera className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-sm font-bold text-white mb-1">カメラの使用が許可されていません</p>
      <p className="text-[11px] text-white/60 mb-4">以下の手順でカメラへのアクセスを許可してください</p>

      <div className="w-full bg-card/95 rounded-xl p-3 mb-4 text-left">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[11px] font-bold text-card-foreground">
            {isIOS && isSafari ? "Safari (iPhone/iPad)" : isAndroid && isChrome ? "Chrome (Android)" : "ブラウザ設定"}
          </span>
        </div>
        <ol className="space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-[11px] text-card-foreground/90 leading-relaxed">
              <span className="shrink-0 w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-white bg-primary px-4 py-2 rounded-lg font-medium shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        カメラを再試行
      </button>
    </motion.div>
  );
}