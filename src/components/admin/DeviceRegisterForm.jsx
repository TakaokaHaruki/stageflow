import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { Plus, Copy, Check, Link as LinkIcon, X, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { unwrapFunctionResponse } from "@/lib/base44Response";

export default function DeviceRegisterForm({ users, onRegistered }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState("shared");
  const [targetUserId, setTargetUserId] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setLabel("");
    setScope("shared");
    setTargetUserId("");
    setResult(null);
    setCopied(false);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.error("端末名を入力してください");
      return;
    }
    if (scope === "user" && !targetUserId) {
      toast.error("対象ユーザーを選択してください");
      return;
    }
    setSubmitting(true);
    try {
      const rawRes = await base44.functions.invoke("registerDevice", {
        label: label.trim(),
        scope,
        target_user_id: scope === "user" ? targetUserId : "",
        target_user_name: scope === "user"
          ? users.find((u) => u.id === targetUserId)?.full_name || ""
          : "",
      });
      const res = unwrapFunctionResponse(rawRes);
      if (res?.ok) {
        setResult(res);
        toast.success("端末を登録しました");
        onRegistered?.();
      } else {
        toast.error(res?.error || "登録に失敗しました");
      }
    } catch (e) {
      const errRes = unwrapFunctionResponse(e?.data) || e;
      toast.error(errRes?.error || errRes?.message || "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const activationUrl = result?.activation_url || "";
  const token = result?.device_token || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(activationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> 新規端末登録
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          >
            <motion.div
              className="ios-glass-float border rounded-xl shadow-elevated w-full max-w-md p-6 max-h-[90dvh] overflow-y-auto sm:bg-card sm:border-border"
              initial={{ y: 32, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 32, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">新規端末登録</h2>
                <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {result ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
                    <Check className="w-4 h-4" /> 登録完了
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                      <MonitorSmartphone className="w-3.5 h-3.5" /> 認証URLを貸与端末で開いてください
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      以下のURLを、貸与したい端末のブラウザで開きます。端末の利用者がログインして認証を完了すると、その端末で制限対象機能が利用可能になります。
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">認証URL</Label>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                      <LinkIcon className="w-4 h-4 shrink-0 text-primary" />
                      <code className="flex-1 text-[11px] break-all">{activationUrl}</code>
                      <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">端末トークン</Label>
                    <code className="block text-[11px] break-all text-muted-foreground bg-muted/30 rounded-lg p-2">{token}</code>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={reset}>続けて登録</Button>
                    <Button className="flex-1" onClick={handleClose}>閉じる</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>端末名 *</Label>
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例: 事務室PC-A" />
                  </div>
                  <div className="space-y-2">
                    <Label>利用範囲</Label>
                    <ResponsiveSelect
                      value={scope}
                      onValueChange={setScope}
                      placeholder="選択してください"
                      label="利用範囲"
                      options={[
                        { value: "shared", label: "全社共通（誰が使っても有効）" },
                        { value: "user", label: "ユーザー個別（特定ユーザーのみ）" },
                      ]}
                    />
                  </div>
                  {scope === "user" && (
                    <div className="space-y-2">
                      <Label>対象ユーザー *</Label>
                      <ResponsiveSelect
                        value={targetUserId}
                        onValueChange={setTargetUserId}
                        placeholder="ユーザーを選択"
                        label="対象ユーザー"
                        options={(users || []).map((u) => ({
                          value: u.id,
                          label: u.full_name || u.email,
                        }))}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={handleClose}>キャンセル</Button>
                    <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? "登録中..." : "登録する"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}