import { Ban, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * 利用制限ユーザーに表示する制限画面
 * 未承認（PendingApproval）と同様にアプリ閲覧を不可にするが、
 * 承認申請フォームは表示せず制限メッセージのみを提示する
 */
export default function RestrictedScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-red-100 dark:bg-red-900/30">
          <Ban className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3">アカウントは利用制限されています</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          このアカウントは管理者により利用が制限されています。<br />
         詳細については管理者にお問い合わせください。
        </p>

        <div className="flex flex-col gap-2">
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