import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, AlertCircle, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "sonner";

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getJstNow() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60000);
  return jst.toISOString().replace("T", " ").substring(0, 16);
}

export default function ChiefPinModal({ acastId, staffName, onSuccess, onClose }) {
  const [mode, setMode] = useState("loading"); // loading | setup | verify | locked | resetSent
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [confirmDigits, setConfirmDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmStep, setShowConfirmStep] = useState(false);
  const inputRefs = useRef([]);
  const confirmInputRefs = useRef([]);

  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    (async () => {
      try {
        const records = await base44.entities.PinCode.filter({ acast_id: acastId });
        const existing = records?.[0];
        if (!existing || !existing.pin_hash) {
          setMode("setup");
        } else {
          setMode("verify");
        }
      } catch (e) {
        setError("PIN情報の取得に失敗しました");
        setMode("verify");
      }
    })();
  }, [acastId]);

  const handleDigitChange = (index, value, isConfirm = false) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const setter = isConfirm ? setConfirmDigits : setDigits;
    const refs = isConfirm ? confirmInputRefs : inputRefs;
    setter((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e, isConfirm = false) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const refs = isConfirm ? confirmInputRefs : inputRefs;
      refs.current[index - 1]?.focus();
    }
  };

  const handleSetup = async () => {
    setError("");
    const pin = digits.join("");
    if (pin.length !== 4) {
      setError("4桁すべて入力してください");
      return;
    }

    if (!showConfirmStep) {
      setShowConfirmStep(true);
      setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      return;
    }

    const confirmPin = confirmDigits.join("");
    if (confirmPin.length !== 4) {
      setError("確認用の4桁をすべて入力してください");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINが一致しません。もう一度入力してください");
      setConfirmDigits(["", "", "", ""]);
      setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      return;
    }

    setSubmitting(true);
    try {
      const hash = await sha256(pin);
      const existing = (await base44.entities.PinCode.filter({ acast_id: acastId }))?.[0];
      if (existing) {
        await base44.entities.PinCode.update(existing.id, {
          pin_hash: hash,
          reset_requested: false,
          reset_requested_at_jst: "",
          created_at_jst: getJstNow(),
        });
      } else {
        await base44.entities.PinCode.create({
          acast_id: acastId,
          pin_hash: hash,
          reset_requested: false,
          reset_requested_at_jst: "",
          created_at_jst: getJstNow(),
        });
      }
      toast.success("PINを設定しました");
      onSuccess();
    } catch (e) {
      setError("PINの保存に失敗しました。もう一度お試しください");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    const pin = digits.join("");
    if (pin.length !== 4) {
      setError("4桁すべて入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const hash = await sha256(pin);
      const records = await base44.entities.PinCode.filter({ acast_id: acastId });
      const existing = records?.[0];
      if (!existing) {
        setMode("setup");
        return;
      }
      if (existing.pin_hash === hash) {
        onSuccess();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setMode("locked");
        } else {
          setError(`PINが正しくありません（残り${MAX_ATTEMPTS - nextAttempts}回）`);
          setDigits(["", "", "", ""]);
          setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
      }
    } catch (e) {
      setError("認証に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRequest = async () => {
    setSubmitting(true);
    try {
      const records = await base44.entities.PinCode.filter({ acast_id: acastId });
      const existing = records?.[0];
      if (existing) {
        await base44.entities.PinCode.update(existing.id, {
          reset_requested: true,
          reset_requested_at_jst: getJstNow(),
        });
      }
      setMode("resetSent");
    } catch (e) {
      toast.error("リセット申請の送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDigitInputs = (values, refs, isConfirm) => (
    <div className="flex justify-center gap-3">
      {values.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleDigitChange(i, e.target.value, isConfirm)}
          onKeyDown={(e) => handleKeyDown(i, e, isConfirm)}
          className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          autoFocus={i === 0 && !isConfirm}
          autoComplete="off"
        />
      ))}
    </div>
  );

  if (mode === "loading") {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-md">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] h-[100dvh] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[90dvh] overflow-y-auto"
          initial={{ y: 30, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              {mode === "setup" ? (
                <KeyRound className="w-6 h-6 text-primary" />
              ) : mode === "locked" ? (
                <Lock className="w-6 h-6 text-destructive" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-primary" />
              )}
            </div>
            <h2 className="font-bold text-base">
              {mode === "setup"
                ? showConfirmStep
                  ? "PINを再入力"
                  : "PINを設定"
                : mode === "verify"
                  ? "PIN認証"
                  : mode === "locked"
                    ? "ロック中"
                    : "申請送信済み"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "setup"
                ? showConfirmStep
                  ? "確認のため同じPINを入力してください"
                  : `${staffName}さん、チーフ認証用の4桁PINを設定してください`
                : mode === "verify"
                  ? "チーフ認証用のPINを入力してください"
                  : mode === "locked"
                    ? "試行回数を超えました。リセット申請してください"
                    : "管理者にリセット申請を送信しました"}
            </p>
          </div>

          {/* Setup mode */}
          {mode === "setup" && (
            <>
              {renderDigitInputs(digits, inputRefs, false)}
              {showConfirmStep && (
                <>
                  <p className="text-center text-xs text-muted-foreground mt-4 mb-2">確認用</p>
                  {renderDigitInputs(confirmDigits, confirmInputRefs, true)}
                </>
              )}
              <AnimatePresence>
                {error && (
                  <motion.p
                    className="flex items-center justify-center gap-1.5 text-xs text-destructive mt-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="flex gap-2 mt-5">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                  キャンセル
                </Button>
                <Button className="flex-1 gap-1.5" onClick={handleSetup} disabled={submitting}>
                  {submitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />処理中...</>
                  ) : showConfirmStep ? (
                    "設定する"
                  ) : (
                    "次へ"
                  )}
                </Button>
              </div>
              {showConfirmStep && (
                <button
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3"
                  onClick={() => {
                    setShowConfirmStep(false);
                    setDigits(["", "", "", ""]);
                    setConfirmDigits(["", "", "", ""]);
                    setError("");
                    setTimeout(() => inputRefs.current[0]?.focus(), 100);
                  }}
                >
                  入力し直す
                </button>
              )}
            </>
          )}

          {/* Verify mode */}
          {mode === "verify" && (
            <>
              {renderDigitInputs(digits, inputRefs, false)}
              <AnimatePresence>
                {error && (
                  <motion.p
                    className="flex items-center justify-center gap-1.5 text-xs text-destructive mt-3"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button className="w-full gap-1.5 mt-5" onClick={handleVerify} disabled={submitting}>
                {submitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />認証中...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" />認証</>
                )}
              </Button>
              <button
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3"
                onClick={handleResetRequest}
                disabled={submitting}
              >
                PINを忘れた方はこちら
              </button>
            </>
          )}

          {/* Locked mode */}
          {mode === "locked" && (
            <>
              <p className="text-center text-sm text-destructive mt-2">
                PIN入力試行回数（{MAX_ATTEMPTS}回）を超えました。
              </p>
              <Button
                variant="outline"
                className="w-full gap-1.5 mt-5"
                onClick={handleResetRequest}
                disabled={submitting}
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "リセット申請"}
              </Button>
              <button
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3"
                onClick={onClose}
              >
                閉じる
              </button>
            </>
          )}

          {/* Reset sent mode */}
          {mode === "resetSent" && (
            <>
              <p className="text-center text-sm text-muted-foreground mt-2 leading-relaxed">
                管理者にリセット申請を送信しました。<br />しばらくお待ちください。
              </p>
              <Button className="w-full mt-5" onClick={onClose}>
                閉じる
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}