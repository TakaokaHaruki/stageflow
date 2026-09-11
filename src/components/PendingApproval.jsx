import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, LogOut, Eye, Send, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";

const ROLE_OPTIONS = [
  { value: "acast_staff", label: "A-CAST社員" },
  { value: "chief", label: "チーフ" },
  { value: "user", label: "ユーザー" },
];

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

const jstNow = () =>
  new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).replace("T", " ").slice(0, 16);

/**
 * 未承認ユーザーに表示するアカウント承認申請画面
 * 未申請時はフォーム、申請済みはそのステータスを表示する
 */
export default function PendingApproval() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [primaryApprover, setPrimaryApprover] = useState("");
  const [finalApprover, setFinalApprover] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reapplying, setReapplying] = useState(false);

  // 登録済みの名前・メールアドレスをプレフィル
  useEffect(() => {
    if (user) {
      setFullName((v) => v || user.full_name || "");
      setEmail((v) => v || user.email || "");
    }
  }, [user]);

  const { data: existing = [], isLoading } = useQuery({
    queryKey: ["my-approval-request", user?.id],
    queryFn: () => base44.entities.ApprovalRequest.filter({ user_id: user.id }, "-created_date", 1),
    enabled: !!user,
  });
  const myRequest = existing[0];

  const handleGuest = () => {
    localStorage.setItem("guest_mode", "true");
    base44.auth.logout("/events");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || !role || !primaryApprover.trim() || !finalApprover.trim()) {
      setError("すべての項目を入力してください。");
      return;
    }
    setSubmitting(true);
    try {
      await base44.entities.ApprovalRequest.create({
        user_id: user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        requested_role: role,
        primary_approver: primaryApprover.trim(),
        final_approver: finalApprover.trim(),
        requested_at_jst: jstNow(),
      });
      queryClient.invalidateQueries({ queryKey: ["my-approval-request", user?.id] });
    } catch (err) {
      setError(err.message || "申請の送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatus = () => (
    <div>
      {myRequest.status === "rejected" ? (
        <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-red-100 dark:bg-red-900/30">
          <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
      ) : (
        <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
      )}
      <h1 className="text-xl font-bold text-foreground mb-3">
        {myRequest.status === "rejected" ? "承認されませんでした" : "承認申請を受け付けました"}
      </h1>
      <div className="text-left bg-muted/50 rounded-lg p-3 mb-4 space-y-1">
        <p className="text-xs text-muted-foreground">申請権限：{ROLE_LABELS[myRequest.requested_role] || myRequest.requested_role}</p>
        <p className="text-xs text-muted-foreground">一次承認者：{myRequest.primary_approver}</p>
        <p className="text-xs text-muted-foreground">最終承認者：{myRequest.final_approver}</p>
        <p className="text-xs text-muted-foreground">申請日時：{myRequest.requested_at_jst}</p>
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {myRequest.status === "rejected"
          ? "この申請は却下されました。内容を確認のうえ、再申請いただけます。"
          : "管理者による承認をお待ちください。\n承認後に再度ログインするとご利用いただけます。"}
      </p>
      {myRequest.status === "rejected" && (
        <Button
          className="h-10 text-sm font-semibold gap-2 w-full"
          onClick={() => {
            setRole(myRequest.requested_role);
            setPrimaryApprover(myRequest.primary_approver);
            setFinalApprover(myRequest.final_approver);
            setReapplying(true);
          }}
        >
          <Send className="w-4 h-4" />
          再申請する
        </Button>
      )}
    </div>
  );

  const renderForm = () => (
    <div>
      <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-amber-100 dark:bg-amber-900/30">
        <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">アカウント承認申請</h1>
      {reapplying && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mb-4">
          前回の申請は却下されました。内容を修正して再申請してください。
        </p>
      )}
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        このアプリをご利用いただくには、管理者による承認が必要です。<br />
        以下のフォームから承認申請を行ってください。
      </p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 text-left">
        <div>
          <Label htmlFor="approvalName" className="text-sm font-medium mb-1.5 block">お名前</Label>
          <Input
            id="approvalName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="新規登録したお名前"
            required
            className="h-10"
          />
        </div>

        <div>
          <Label htmlFor="approvalEmail" className="text-sm font-medium mb-1.5 block">メールアドレス</Label>
          <Input
            id="approvalEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="新規登録したメールアドレス"
            required
            className="h-10"
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-1.5 block">申請権限</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setRole(opt.value)}
                className={`rounded-lg border px-1 py-2.5 text-xs font-medium transition-colors ${
                  role === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="approvalPrimaryApprover" className="text-sm font-medium mb-1.5 block">一次承認者</Label>
            <Input
              id="approvalPrimaryApprover"
              type="text"
              value={primaryApprover}
              onChange={(e) => setPrimaryApprover(e.target.value)}
              placeholder="一次承認者のお名前"
              required
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="approvalFinalApprover" className="text-sm font-medium mb-1.5 block">最終承認者</Label>
            <Input
              id="approvalFinalApprover"
              type="text"
              value={finalApprover}
              onChange={(e) => setFinalApprover(e.target.value)}
              placeholder="最終承認者のお名前"
              required
              className="h-10"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
        )}

        <Button type="submit" disabled={submitting} className="h-10 text-sm font-semibold gap-2 w-full">
          <Send className="w-4 h-4" />
          {submitting ? "送信中..." : "承認申請を送信"}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 text-center">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div>
        ) : myRequest && myRequest.status !== "rejected" ? (
          renderStatus()
        ) : myRequest && !reapplying ? (
          renderStatus()
        ) : (
          renderForm()
        )}

        <div className="flex flex-col gap-2 mt-6">
          <Button variant="outline" className="gap-2 w-full" onClick={handleGuest}>
            <Eye className="w-4 h-4" />
            ゲストとして閲覧
          </Button>
          <button
            onClick={() => base44.auth.logout()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            <span className="flex items-center justify-center gap-1">
              <LogOut className="w-3 h-3" />
              ログアウト
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}