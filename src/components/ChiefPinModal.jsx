import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, AlertCircle, RefreshCw, KeyRound } from "lucide-react";
import ModalShell from "@/components/ModalShell";
import { toast } from "sonner";
import { setPortalToken } from "@/lib/portalAuth";

function getJstNow() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60000);
  return jst.toISOString().replace("T", " ").substring(0, 16);
}

export default function ChiefPinModal({ acastId, staffName, onSuccess, onClose }) {
  // PIN未設定時の初回設定はポータルからはできない（管理者がアプリ側で設定する）ため、
  // ポータルでは verify / notSet / locked / resetSent のみを扱う
  const [mode, setMode] = useState("verify");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const inputRefs = useRef([]);

  const MAX_ATTEMPTS = 5;

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
      // PIN照合はサーバー側で行う（失敗回数・ロックもサーバー側で管理）
      const res = await base44.functions.invoke("portalPinAuth", { action: "verify", acast_id: acastId, pin });
      const data = res?.data || {};
      if (data.ok && data.token) {
        setPortalToken(data.token);
        onSuccess(data.token);
      } else if (data.setup) {
        setMode("notSet");
      } else if (data.locked) {
        setMode("locked");
      } else {
        const nextAttempts = data.attempts ?? attempts + 1;
        setAttempts(nextAttempts);
        setError(`PINが正しくありません（残り${MAX_ATTEMPTS - nextAttempts}回）`);
        setDigits(["", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (e) {
      setError("認証に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupRequest = async () => {
    setSubmitting(true);
    try {
      await base44.functions.invoke("portalPinAuth", { action: "reset_request", acast_id: acastId });
      setMode("resetSent");
    } catch (e) {
      toast.error("設定申請の送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDigitInputs = (values, refs) => (
    <div className="flex justify-center gap-3">
      {values.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleDigitChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
          autoFocus={i === 0}
          autoComplete="off"
        />
      ))}
    </div>
  );

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              {mode === "notSet" ? (
                <KeyRound className="w-6 h-6 text-primary" />
              ) : mode === "locked" ? (
                <Lock className="w-6 h-6 text-destructive" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-primary" />
              )}
            </div>
            <h2 className="font-bold text-base">
              {mode === "notSet"
                ? "PINが未設定です"
                : mode === "verify"
                  ? "PIN認証"
                  : mode === "locked"
                    ? "ロック中"
                    : "申請送信済み"}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "notSet"
                ? `${staffName}さんのチーフPINはまだ設定されていません`
                : mode === "verify"
                  ? "チーフ認証用のPINを入力してください"
                  : mode === "locked"
                    ? "試行回数を超えました。リセット申請してください"
                    : "管理者にリセット申請を送信しました"}
            </p>
          </div>

          {/* Verify mode */}
          {mode === "verify" && (
            <>
              {renderDigitInputs(digits, inputRefs)}
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
                onClick={handleSetupRequest}
                disabled={submitting}
              >
                PINを忘れた方はこちら
              </button>
            </>
          )}

          {/* Not set mode */}
          {mode === "notSet" && (
            <>
              <p className="text-center text-sm text-muted-foreground mt-2 leading-relaxed">
                チーフPINの設定はアプリの管理者が行います。
                <br />
                管理者に設定を依頼してください。
              </p>
              <Button
                variant="outline"
                className="w-full gap-1.5 mt-5"
                onClick={handleSetupRequest}
                disabled={submitting}
              >
                {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : "設定を申請"}
              </Button>
              <button
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3"
                onClick={onClose}
              >
                閉じる
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
                onClick={handleSetupRequest}
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
    </ModalShell>
  );
}