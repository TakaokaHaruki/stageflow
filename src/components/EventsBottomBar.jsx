import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, ShieldCheck, Sun, Moon, LogIn, LogOut, User, Trash2, X, MoreHorizontal } from "lucide-react";
import { useTheme } from "@/lib/ThemeProvider";
import { getUserDisplayName } from "@/lib/userDisplay";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function EventsBottomBar({ canEdit, isAdmin, currentUser, onNewEvent, onAdminSettings, onCurrentUserChange }) {
  const navigate = useNavigate();
  const { isDark, setIsDark } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  const isGuest = !currentUser;

  const handleDeleteAccount = async () => {
    try {
      if (currentUser?.id) {
        await base44.entities.User.delete(currentUser.id);
      }
    } catch {}
    base44.auth.logout();
  };

  const primaryActions = [];
  if (canEdit) primaryActions.push({ id: "new", label: "新規", icon: Plus, onClick: onNewEvent });
  if (canEdit) primaryActions.push({ id: "management", label: "管理設定", icon: ShieldCheck, onClick: onAdminSettings });

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] sm:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-2 right-2 rounded-lg border border-border bg-card p-1.5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">その他</span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                onClick={() => setMoreOpen(false)}
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { toggleTheme(); setMoreOpen(false); }}
                className="flex min-h-10 items-center gap-2 rounded-md border border-border px-2.5 text-left text-xs font-semibold text-foreground hover:bg-muted"
              >
                {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                {isDark ? "ライト" : "ダーク"}
              </button>
            </div>
            <div className="mt-1.5 border-t border-border pt-1.5">
              {isGuest ? (
                <button
                  type="button"
                  onClick={() => { localStorage.removeItem("guest_mode"); navigate("/login"); setMoreOpen(false); }}
                  className="flex w-full min-h-10 items-center gap-2 rounded-md border border-border px-2.5 text-left text-xs font-semibold text-foreground hover:bg-muted"
                >
                  <LogIn className="h-4 w-4 shrink-0" />
                  ログイン
                </button>
              ) : (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <span className="flex-1 min-w-0 truncate text-[11px] font-medium">{getUserDisplayName(currentUser)}</span>
                  <button onClick={() => setConfirmDeleteAccount(true)} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive" title="アカウント削除">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button onClick={() => base44.auth.logout()} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive" title="ログアウト">
                    <LogOut className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md safe-area-bottom sm:hidden">
        <div className="grid min-h-14" style={{ gridTemplateColumns: `repeat(${primaryActions.length + 1}, minmax(0, 1fr))` }}>
          {primaryActions.map(({ id, label, icon: Icon, onClick }) => (
            <button
              key={id}
              type="button"
              onClick={() => onClick?.()}
              className="flex min-w-0 select-none flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 text-muted-foreground transition-colors hover:text-primary"
              aria-label={label}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="max-w-full truncate text-[10px] font-medium leading-none">{label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex min-w-0 select-none flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 transition-colors ${moreOpen ? "text-primary" : "text-muted-foreground"}`}
            aria-expanded={moreOpen}
            aria-label="その他"
          >
            <MoreHorizontal className="h-4.5 w-4.5 shrink-0" />
            <span className="text-[10px] font-medium leading-none">その他</span>
          </button>
        </div>
      </div>

      {confirmDeleteAccount && (
        <ConfirmDialog
          message={"アカウントを削除しますか？\nこの操作は取り消せません。"}
          confirmLabel="削除する"
          confirmVariant="destructive"
          onConfirm={() => { setConfirmDeleteAccount(false); handleDeleteAccount(); }}
          onCancel={() => setConfirmDeleteAccount(false)}
        />
      )}
    </>
  );
}