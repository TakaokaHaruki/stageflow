import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, LogOut, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingApproval() {
  const navigate = useNavigate();

  const handleGuest = () => {
    localStorage.setItem("guest_mode", "true");
    base44.auth.logout("/events");
  };

  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3">管理者による承認待ちです</h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          ご登録ありがとうございます。<br />
          管理者がアカウントを承認するまでご利用いただけません。<br />
          承認後に再度ログインしてください。
        </p>
        <div className="flex flex-col gap-2">
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