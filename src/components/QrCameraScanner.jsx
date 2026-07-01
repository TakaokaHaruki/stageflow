import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { X, Camera, RefreshCw, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CameraPermissionGuide from "@/components/CameraPermissionGuide";

/**
 * カメラでA-CAST IDのQRコードをリアルタイム読取するコンポーネント
 * @param {function} onScan - QR読取成功時のコールバック（読取ったデータを渡す）
 * @param {function} onClose - 閉じるボタン
 * @param {boolean} processing - 処理中フラグ（trueの時はスキャンを一時停止）
 */
export default function QrCameraScanner({ onScan, onClose, processing = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [step, setStep] = useState("intro");
  const [error, setError] = useState("");
  const [scannedValue, setScannedValue] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

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

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError("");
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
      setIsStarting(false);
      setStep("scanning");
    } catch (err) {
      setIsStarting(false);
      setStep("error");
      if (err?.name === "NotAllowedError") {
        setError("permission_denied");
      } else if (err?.name === "NotFoundError") {
        setError("カメラが見つかりません。");
      } else {
        setError("カメラの起動に失敗しました。");
      }
    }
  }, []);

  // スキャンループ
  useEffect(() => {
    if (step !== "scanning" || isStarting || error || scannedValue || processing) return;

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
            setScannedValue(code.data);
            onScan(code.data);
            return; // スキャン停止
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
  }, [step, isStarting, error, scannedValue, processing, onScan]);

  // クリーンアップ
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleStartCamera = () => {
    setStep("scanning");
    startCamera();
  };

  const handleRetry = () => {
    setScannedValue(null);
    setError("");
    startCamera();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md"
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
            <Camera className="w-4 h-4 text-primary" />
            QR読取
          </h3>
          <button
            onClick={onClose}
            disabled={processing}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative bg-black aspect-square">
          {/* 説明画面 */}
          {step === "intro" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <Camera className="w-16 h-16 text-white/80 mb-4" />
              <p className="text-sm text-white/90 leading-relaxed mb-6">
                QRコードを読み取るために<br />カメラへのアクセスを求めます
              </p>
              <button
                onClick={handleStartCamera}
                className="flex items-center gap-2 text-sm text-white bg-primary px-8 py-2.5 rounded-xl font-medium"
              >
                <Camera className="w-4 h-4" />
                カメラを起動する
              </button>
            </div>
          )}

          {/* カメラ映像 */}
          {step === "scanning" && (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* スキャン枠 */}
          {step === "scanning" && !scannedValue && (
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

          {/* 開始中 */}
          {isStarting && step === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* エラー */}
          {step === "error" && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center px-6 text-center">
              {error === "permission_denied" ? (
                <CameraPermissionGuide onRetry={startCamera} />
              ) : (
                <>
                  <p className="text-xs text-destructive-foreground bg-destructive rounded-lg px-3 py-2 mb-3">{error}</p>
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
        </div>

        <div className="px-4 py-3">
          <p className="text-[11px] text-muted-foreground text-center">
            {scannedValue
              ? "データを処理しています..."
              : "スタッフのA-CAST ID QRコードをカメラにかざしてください"}
          </p>
          {scannedValue && !processing && (
            <button
              onClick={handleRetry}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-primary border border-border rounded-lg py-1.5 hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              別のQRを読み取る
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}