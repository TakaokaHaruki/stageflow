import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Copy, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

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
      const res = await base44.functions.invoke("registerDevice", {
        label: label.trim(),
        scope,
        target_user_id: scope === "user" ? targetUserId : "",
        target_user_name: scope === "user"
          ? users.find((u) => u.id === targetUserId)?.full_name || ""
          : "",
      });
      if (res?.ok) {
        setResult(res);
        toast.success("端末を登録しました。対象端末で認証を完了してください");
        onRegistered?.();
      } else {
        toast.error(res?.error || "登録に失敗しました");
      }
    } catch (e) {
      const msg = e?.data?.error || e?.message || "登録に失敗しました";
      toast.error(msg);
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

  if (!open && !result) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> 新規端末登録
      </Button>
    );
  }

  if (result) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
          <Check className="w-4 h-4" /> 登録完了 — 対象端末で認証してください
        </div>
        <p className="text-xs text-muted-foreground">
          以下のURLを貸与する端末のブラウザで開き、認証を完了してください。認証後その端末でのみ制限対象機能が利用できます。
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
          <LinkIcon className="w-4 h-4 shrink-0 text-primary" />
          <code className="flex-1 text-xs break-all">{activationUrl}</code>
          <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">端末トークン: <code className="break-all">{token}</code></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reset}>続けて登録</Button>
          <Button size="sm" variant="ghost" onClick={() => { reset(); setOpen(false); }}>閉じる</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="text-sm font-semibold">新規端末登録</div>
      <div className="space-y-2">
        <Label className="text-xs">端末名</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例: 事務室PC-A" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">利用範囲</Label>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shared">全社共通（誰が使っても有効）</SelectItem>
            <SelectItem value="user">ユーザー個別（特定ユーザーのみ）</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {scope === "user" && (
        <div className="space-y-2">
          <Label className="text-xs">対象ユーザー</Label>
          <Select value={targetUserId} onValueChange={setTargetUserId}>
            <SelectTrigger><SelectValue placeholder="ユーザーを選択" /></SelectTrigger>
            <SelectContent>
              {(users || []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "登録中..." : "登録する"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); reset(); }}>キャンセル</Button>
      </div>
    </div>
  );
}