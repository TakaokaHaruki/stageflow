import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Check, X, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/AuthContext";
import { getUserDisplayName } from "@/lib/userDisplay";

const ROLE_LABELS = { acast_staff: "A-CAST社員", chief: "チーフ", user: "ユーザー" };

// 承認時に付与する実際のアプリ権限（A-CAST社員は一般ユーザー権限で利用）
const APPROVED_ROLE = { acast_staff: "user", chief: "chief", user: "user" };

const STATUS_META = {
  pending: { label: "承認待ち", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  approved: { label: "承認済み", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  rejected: { label: "却下", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

const jstNow = () =>
  new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).replace("T", " ").slice(0, 16);

/**
 * 管理者用：アカウント承認申請の確認・承認・却下
 */
export default function ApprovalRequestManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [confirm, setConfirm] = useState(null); // { request, action }

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["approval-requests"],
    queryFn: () => base44.entities.ApprovalRequest.list("-created_date", 200),
  });

  const handleMutation = useMutation({
    mutationFn: async ({ request, action }) => {
      // 先に申請ステータスを更新してから権限を付与する（途中ログインで未承認に巻き戻らないように）
      await base44.entities.ApprovalRequest.update(request.id, {
        status: action === "approve" ? "approved" : "rejected",
        handled_at_jst: jstNow(),
        handled_by: user ? getUserDisplayName(user) : "",
      });
      if (action === "approve") {
        await base44.entities.User.update(request.user_id, {
          role: APPROVED_ROLE[request.requested_role] || "user",
        });
      }
    },
    onError: () => toast.error("処理に失敗しました"),
    onSuccess: (_, { action }) => {
      toast.success(action === "approve" ? "承認しました。申請者に再ログインを案内してください。" : "却下しました");
      setConfirm(null);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["approval-requests"] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const handled = requests.filter((r) => r.status !== "pending");

  const renderRow = (r) => {
    const status = STATUS_META[r.status] || STATUS_META.pending;
    return (
      <div key={r.id} className="bg-card px-3 py-2.5 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold truncate">{r.full_name}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${status.className}`}>
              {status.label}
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground shrink-0">
              {ROLE_LABELS[r.requested_role] || r.requested_role}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
            <span>一次：{r.primary_approver}</span>
            <span>・</span>
            <span>最終：{r.final_approver}</span>
            <span>・</span>
            <span>申請：{r.requested_at_jst}</span>
            {r.handled_at_jst && (
              <>
                <span>・</span>
                <span>{r.status === "approved" ? "承認" : "却下"}：{r.handled_at_jst}{r.handled_by ? `（${r.handled_by}）` : ""}</span>
              </>
            )}
          </div>
        </div>
        {r.status === "pending" && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setConfirm({ request: r, action: "approve" })}
              className="p-1.5 rounded-md text-green-600 hover:bg-green-600/10 transition-colors"
              title="承認"
              aria-label="承認"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirm({ request: r, action: "reject" })}
              className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
              title="却下"
              aria-label="却下"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 承認待ち */}
      <div className="rounded-2xl border border-border bg-card shadow-md overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/40">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <h2 className="text-xs font-semibold">承認待ち</h2>
          <span className="text-[10px] text-muted-foreground">{pending.length}件</span>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["approval-requests"] })}
            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" />更新
          </button>
        </div>
        {pending.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">承認待ちの申請はありません</p>
        ) : (
          <div className="divide-y divide-border">{pending.map(renderRow)}</div>
        )}
      </div>

      {/* 処理済み */}
      <div className="rounded-2xl border border-border bg-card shadow-md overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/40">
          {handled.some((r) => r.status === "rejected") ? (
            <XCircle className="w-3.5 h-3.5 text-destructive" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          )}
          <h2 className="text-xs font-semibold">処理済み</h2>
          <span className="text-[10px] text-muted-foreground">{handled.length}件</span>
        </div>
        {handled.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">処理済みの申請はありません</p>
        ) : (
          <div className="divide-y divide-border">{handled.map(renderRow)}</div>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          message={
            confirm.action === "approve"
              ? `「${confirm.request.full_name}」を${ROLE_LABELS[confirm.request.requested_role] || "ユーザー"}として承認しますか？\n承認後、申請者は再ログインでアプリを利用できます。`
              : `「${confirm.request.full_name}」の申請を却下しますか？`
          }
          confirmLabel={confirm.action === "approve" ? "承認" : "却下"}
          confirmVariant={confirm.action === "approve" ? "default" : "destructive"}
          onConfirm={() => handleMutation.mutate(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}