import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

/**
 * パスワード変更カード
 * Googleログインのみでパスワード未設定のユーザー（password_set フラグなし）には表示されない
 */
export default function PasswordChangeCard({ currentUser }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!currentUser?.password_set) return null;

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("新しいパスワードと確認用パスワードが一致しません。");
      return;
    }
    if (newPassword.length < 8) {
      setError("新しいパスワードは8文字以上で入力してください。");
      return;
    }
    setIsSubmitting(true);
    try {
      await base44.auth.changePassword({
        userId: currentUser.id,
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("パスワードを変更しました");
    } catch (err) {
      const msg = err.message || "";
      if (err.status === 401 || /current password/i.test(msg)) {
        setError("現在のパスワードが正しくありません。");
      } else if (err.status === 422 || /requirements|characters/i.test(msg)) {
        setError("新しいパスワードが要件を満たしていません。8文字以上で設定してください。");
      } else {
        setError(msg || "パスワードの変更に失敗しました。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">パスワード変更</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <Label htmlFor="current-password" className="mb-1 block text-xs font-medium">現在のパスワード</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="h-10"
          />
        </div>
        <div>
          <Label htmlFor="new-password" className="mb-1 block text-xs font-medium">新しいパスワード</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="8文字以上"
            autoComplete="new-password"
            className="h-10"
          />
        </div>
        <div>
          <Label htmlFor="confirm-password" className="mb-1 block text-xs font-medium">新しいパスワード（確認）</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="h-10"
          />
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}
        <Button type="submit" disabled={!canSubmit} className="h-10 text-sm font-semibold">
          {isSubmitting ? "変更中..." : "パスワードを変更"}
        </Button>
      </form>
    </div>
  );
}