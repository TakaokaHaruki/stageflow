import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { X, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function DeviceEditModal({ device, users, onSaved }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState("shared");
  const [targetUserId, setTargetUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !device) return;
    setLabel(device.label || "");
    setScope(device.scope || "shared");
    setTargetUserId(device.target_user_id || "");
  }, [open, device]);

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
      const targetUser = users.find((u) => u.id === targetUserId);
      await base44.entities.Device.update(device.id, {
        label: label.trim(),
        scope,
        target_user_id: scope === "user" ? targetUserId : "",
        target_user_name: scope === "user" ? targetUser?.full_name || "" : "",
      });
      toast.success("端末情報を更新しました");
      setOpen(false);
      onSaved?.();
    } catch (e) {
      toast.error(e?.message || "更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (!device) return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="shrink-0"
      >
        <Pencil className="w-3.5 h-3.5" /> 編集
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          >
            <motion.div
              className="bg-card border border-border rounded-xl shadow-elevated w-full max-w-md p-6 max-h-[90dvh] overflow-y-auto"
              initial={{ y: 32, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 32, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">端末情報の編集</h2>
                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                  <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>キャンセル</Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                    <Save className="w-4 h-4" />
                    {submitting ? "更新中..." : "更新する"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}