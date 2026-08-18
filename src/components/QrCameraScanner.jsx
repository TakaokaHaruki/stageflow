import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { X, Camera, RefreshCw, CheckCircle, ScanLine, ShieldCheck, Upload } from "lucide-react";
import { motion } from "framer-motion";
import QRCodeUpload from "@/components/QRCodeUpload";

/**
 * カメラで A-CAST ID の QR コードをリアルタイム読取するコンポーネント
 * @param {function} onScan - QR 読取成功時のコールバック（読取ったデータを渡す）
 * @param {function} onClose - 閉じるボタン
 * @param {boolean} processing - 処理中フラグ（true の時はスキャンを一時停止）
 */
export default function QrCameraScanner({ onScan, onClose, processing = false, autoStart = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [phase, setPhase] = useState(autoStart ? "starting" : "ready"); // ready | starting | scanning | error
  const [cameraError, setCameraError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [scannedValue, setScannedValue] = useState(null);
  const [mode, setMode] = useState("camera"); // camera | upload

  // autoStart が true の場合、マウント時にカメラを起動
  useEffect(() => {
    if (autoStart && phase === "starting") {
      startCamera();
    }
  }, [autoStart, phase]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ユーザージェスチャー内で直接 getUserMedia を呼ぶ（iOS/Android 対応）
  const startCamera = useCallback(async () => {
    setPhase("starting");
    setCameraError("");

    // iframe 内（プレビュー環境等）では getUserMedia が権限ダイアログを出せず
    // 即座に NotAllowedError で拒否されるため、先に検知して新規タブへ誘導
    const inIframe = window.self !== window.top;
    if (inIframe) {
      setCameraError("iframe_blocked");
      setPhase("error");
      return;
    }

    // HTTPS チェック - 本番環境で重要
    const isSecure = window.isSecureContext || window.location.protocol === "https:";
    if (!isSecure) {
      setCameraError("https_required");
      setPhase("error");
      return;
    }

    // カメラ API のサポート確認
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      setCameraError("no_media_devices");
      setPhase("error");
      return;
    }

    // Android Chrome 向け：権限が事前にブロックされていないか確認
    if (navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: "camera" });
        if (permissionStatus.state === "denied") {
          setCameraError("permission_denied");
          setPhase("error");
          return;
        }
      } catch (permErr) {
        // permissions API がサポートされていない場合は無視
        console.log("Permissions API not supported:", permErr?.message);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      setPhase("scanning");
    } catch (err) {
      console.error("Camera error:", err?.name, err?.message);
      if (err?.name === "NotAllowedError") {
        setCameraError("permission_denied");
      } else if (err?.name === "NotFoundError") {
        setCameraError("カメラが見つかりません。");
      } else if (err?.name === "NotReadableError") {
        setCameraError("カメラが別のアプリで使用されています。");
      } else if (err?.name === "OverconstrainedError") {
        setCameraError("カメラの制約条件を満たせませんでした。");
      } else {
        setCameraError(`エラー：${err?.message || err?.name || "不明なエラー"}`);
      }
      setPhase("error");
    }
  }, []);



  // processing が false になったら scannedValue をリセット（連続読み取りのため）
  useEffect(() => {
    if (!processing && scannedValue) {
      setScannedValue(null);
    }
  }, [processing, scannedValue]);

  // 読取後、一定間隔は再読取を防止（デバウンス）
  const lastScanTimeRef = useRef(0);
  useEffect(() => {
    if (phase !== "scanning" || cameraError || processing) return;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d");
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code && code.data) {
            const now = Date.now();
            if (now - lastScanTimeRef.current >= 1500) {
              lastScanTimeRef.current = now;
              setScannedValue(code.data);
              onScan(code.data);
            }
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, cameraError, processing, onScan]);

  // アンマウント時にカメラ停止
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleRetry = () => {
    setScannedValue(null);
    setCameraError("");
    startCamera();
  };

  const handleModeToggle = (newMode) => {
    setMode(newMode);
    // モード切替時に各モードのエラーをリセット
    if (newMode === "camera") {
      setCameraError("");
    } else {
      setUploadError("");
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] h-[100dvh] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget && !processing) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            {mode === "camera" ? <Camera className="w-4 h-4 text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
            QR 読取
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleModeToggle(mode === "camera" ? "upload" : "camera")}
              className="text-xs text-primary hover:text-foreground transition-colors"
              disabled={processing}
            >
              {mode === "camera" ? "アップロード" : "カメラ"}
            </button>
            <button
              onClick={onClose}
              disabled={processing}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative bg-black aspect-square">
          {/* アップロードモード */}
          {mode === "upload" ? (
            <div className="absolute inset-0 bg-card p-4">
              <QRCodeUpload
                onQRRead={(data) => {
                  if (data) {
                    setScannedValue(data);
                    onScan(data);
                  } else {
                    setUploadError("QR コードが検出されませんでした");
                  }
                }}
                loading={processing}
                error={uploadError}
              />
            </div>
          ) : (
            <>
          {/* カメラ映像 */}
          {(phase === "scanning" || phase === "starting") && (
            <video
              ref={videoRef}
              playsInline
              webkit-playsinline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* スキャン枠 */}
          {phase === "scanning" && !scannedValue && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-lg" />
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400 shadow-lg animate-pulse" />
              </div>
            </div>
          )}

          {/* 読取成功オーバーレイ */}
          {scannedValue && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
              <CheckCircle className="w-12 h-12 text-emerald-400 mb-2" />
              <p className="text-sm text-white font-medium">読取り完了</p>
              <p className="text-xs text-white/60 mt-1">{scannedValue}</p>
            </div>
          )}

          {/* 処理中オーバーレイ */}
          {processing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
              <p className="text-xs text-white">追加中...</p>
            </div>
          )}

          {/* 起動中スピナー */}
          {phase === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* 説明・起動画面（モバイル向け） */}
          {phase === "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-5">
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                  <div className="relative w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                    <ScanLine className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <p className="text-sm text-white font-medium mb-1">QR コードを読み取ります</p>
                <p className="text-[11px] text-white/50 mb-5 leading-relaxed px-2">
                  下のボタンをタップすると<br />カメラの使用許可を求めます
                </p>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 text-sm text-white bg-primary px-7 py-3 rounded-2xl font-semibold shadow-lg active:scale-95 transition-transform"
                >
                  <Camera className="w-4 h-4" />
                  カメラを起動
                </button>
                <div className="flex items-center gap-1 mt-4 text-[10px] text-white/30">
                  <ShieldCheck className="w-3 h-3" />
                  カメラ映像は保存されません
                </div>
              </motion.div>
            </div>
          )}

          {/* エラー */}
          {phase === "error" && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center px-6 text-center">
              {cameraError === "permission_denied" ? (
                <PermissionDeniedGuide onRetry={startCamera} />
              ) : cameraError === "iframe_blocked" ? (
                <>
                  <Camera className="w-10 h-10 text-white/40 mb-3" />
                  <p className="text-xs text-white/80 mb-3 leading-relaxed">
                    カメラ機能を利用するには<br />新しいタブで開く必要があります
                  </p>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-white bg-primary px-4 py-2 rounded-lg"
                  >
                    新しいタブで開く
                  </a>
                </>
              ) : cameraError === "https_required" ? (
                <>
                  <Camera className="w-10 h-10 text-white/40 mb-3" />
                  <p className="text-xs text-white/80 mb-3 leading-relaxed">
                    カメラ機能には HTTPS 接続が必要です。<br />本番環境で動作します。
                  </p>
                </>
              ) : cameraError === "no_media_devices" ? (
                <>
                  <Camera className="w-10 h-10 text-white/40 mb-3" />
                  <p className="text-xs text-white/80 mb-3 leading-relaxed">
                    カメラ機能に対応していません。<br />HTTPS 接続が必要です。
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs text-destructive-foreground bg-destructive rounded-lg px-3 py-2 mb-3">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-1.5 text-xs text-white bg-primary px-3 py-1.5 rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    再試行
                  </button>
                </>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            {scannedValue
              ? "データを処理しています..."
              : mode === "camera"
                ? "スタッフの A-CAST ID QR コードをカメラにかざしてください"
                : "スタッフの A-CAST ID QR コードの画像を選択してください"}
          </p>
          {scannedValue && !processing && (
            <button
              onClick={handleRetry}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-primary border border-border rounded-lg py-1.5 hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              別の QR を読み取る
            </button>
          )}
          {/* カメラモードのみエラー時のリトライ表示 */}
          {phase === "error" && mode === "camera" && cameraError !== "permission_denied" && cameraError !== "iframe_blocked" && (
            <button
              onClick={handleRetry}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-primary border border-border rounded-lg py-1.5 hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              再試行
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** 権限拒否時のガイド（モバイル向け） */
function PermissionDeniedGuide({ onRetry }) {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const steps = isIOS
    ? [
        "Safari のアドレスバー横の「AA」または権限アイコンをタップ",
        "「設定」から「カメラ」をオンにする",
        "または 設定 › Safari › カメラ を「許可」に変更",
      ]
    : isAndroid
      ? [
          "Chrome のアドレスバー横の権限アイコンをタップ",
          "「カメラ」を「許可」に変更",
          "または 設定 › アプリ › Chrome › 権限 › カメラ",
        ]
      : [
          "ブラウザのアドレスバー横のカメラアイコンをクリック",
          "「カメラを許可」を選択",
          "ページを再読み込みしてください",
        ];

  return (
    <div className="w-full">
      <Camera className="w-10 h-10 text-white/40 mx-auto mb-3" />
      <p className="text-sm text-white font-medium mb-4">カメラの使用が許可されていません</p>
      <div className="text-left bg-white/5 rounded-xl p-3 mb-4">
        <p className="text-[11px] text-white/60 mb-2 font-medium">以下の手順で許可してください：</p>
        <ol className="space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="text-[11px] text-white/80 flex gap-2">
              <span className="text-primary font-bold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-white bg-primary px-4 py-2 rounded-lg mx-auto"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        カメラを再起動
      </button>
    </div>
  );
}