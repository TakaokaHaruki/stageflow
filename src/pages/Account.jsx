import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { base44 } from "@/api/base44Client";
import { LogOut, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { getUserDisplayName } from "@/lib/userDisplay";
import ConfirmDialog from "@/components/ConfirmDialog";
import PasswordChangeCard from "@/components/account/PasswordChangeCard";
import DeleteAccountModal from "@/components/account/DeleteAccountModal";
import { Button } from "@/components/ui/button";

const ROLE_LABELS = { admin: "管理者", chief: "チーフ", user: "メンバー", unapproved: "承認待ち" };

export default function Account() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileError, setProfileError] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadUser = () => {
    setProfileError(false);
    base44.auth.me().then(setCurrentUser).catch(() => setProfileError(true));
  };

  useEffect(() => {
    loadUser();
    QRCode.toDataURL(`${window.location.origin}/`, { width: 240, margin: 1 })
      .then(setQrUrl)
      .catch(() => {});
  }, []);

  const displayName = currentUser ? getUserDisplayName(currentUser) : "";
  const role = currentUser?.role;

  const handleDeleteAccount = async () => {
    try {
      if (currentUser?.id) await base44.entities.User.delete(currentUser.id);
    } catch {}
    base44.auth.logout();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-3 px-2 py-3">
        {/* プロフィール */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
          <h2 className="mb-3 text-sm font-bold">プロフィール</h2>
          {profileError ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-destructive">ユーザー情報の取得に失敗しました</p>
              <Button variant="outline" size="sm" onClick={loadUser}>再試行</Button>
            </div>
          ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
              {(displayName || "?").charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{displayName || "—"}</p>
                {role && (
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {ROLE_LABELS[role] || role}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{currentUser?.email || "—"}</p>
            </div>
          </div>
          )}
        </div>

        {/* パスワード変更（Googleログインのみでパスワード未設定のユーザーには非表示） */}
        <PasswordChangeCard currentUser={currentUser} />

        {/* 表示設定 */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-md">
          <div>
            <h2 className="text-sm font-bold">テーマ</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">ライト/ダーク表示を切り替えます</p>
          </div>
          <ThemeToggle />
        </div>

        {/* スタッフポータルQR */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
          <h2 className="mb-1 text-sm font-bold">スタッフポータル</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            スタッフ向けポータルのQRコードです。共有してスタッフにアクセスしてもらえます。
          </p>
          <div className="flex items-center gap-4">
            {qrUrl && (
              <img src={qrUrl} alt="スタッフポータルQRコード" className="h-28 w-28 shrink-0 rounded-lg border border-border bg-white p-1" />
            )}
            <p className="min-w-0 break-all text-xs text-muted-foreground">{window.location.origin}/</p>
          </div>
        </div>

        {/* アカウント操作 */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-md">
          <h2 className="mb-3 text-sm font-bold">アカウント操作</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-1.5" onClick={() => base44.auth.logout()}>
              <LogOut className="h-4 w-4" />ログアウト
            </Button>
            <Button variant="destructive" className="gap-1.5" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />アカウント削除
            </Button>
          </div>
        </div>

        {confirmDelete && (
          <ConfirmDialog
            message={"アカウントを削除しますか？\nこの操作は取り消せません。"}
            confirmLabel="削除する"
            confirmVariant="destructive"
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => { setConfirmDelete(false); setShowDeleteConfirm(true); }}
          />
        )}

        {showDeleteConfirm && (
          <DeleteAccountModal
            displayName={displayName}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={() => { setShowDeleteConfirm(false); handleDeleteAccount(); }}
          />
        )}
      </div>
  );
}