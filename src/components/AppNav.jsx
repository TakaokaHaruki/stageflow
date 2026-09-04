import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import CrewlyLogo from "@/components/CrewlyLogo";
import ThemeToggle from "@/components/ThemeToggle";
import SidebarNav from "@/components/SidebarNav";
import GlobalBanner from "@/components/GlobalBanner";
import UserNameEditor, { getUserDisplayName } from "@/components/UserNameEditor";
import { Button } from "@/components/ui/button";
import { getNavItems } from "@/lib/navConfig";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * 全管理画面共通のシェル。
 * ガイドブック準拠の情報階層（共通ヘッダ → グローバルナビ → コンテンツ）を提供する。
 */
export default function AppNav({ activeTab, title, actions = null, children }) {
  const navigate = useNavigate();
  const { isAdmin, canEdit, isGuest } = useUserRole();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!isGuest) base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [isGuest]);

  const navItems = getNavItems({ isAdmin, canEdit, isGuest });

  const handleSelect = (tabId) => {
    const item = navItems.find((i) => i.id === tabId);
    if (item) navigate(item.path);
  };

  return (
    <div className="min-h-screen bg-background safe-area-bottom relative scrollbar-hide overflow-x-clip">
      <GlobalBanner />
      {/* 共通ヘッダ */}
      <div className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-[1400px] mx-auto px-2 pb-1.5 pt-1 flex items-center gap-1.5">
          <CrewlyLogo className="mr-1" administrator={isAdmin} />
          <h1 className="shrink-0 text-base font-bold tracking-tight text-foreground">{title}</h1>
          <div className="ml-auto flex items-center gap-1">
            {actions}
            <ThemeToggle />
            {isGuest || !currentUser ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs px-2 shrink-0"
                onClick={() => { localStorage.removeItem("guest_mode"); navigate("/login"); }}
              >
                <LogIn className="w-3 h-3" />ログイン
              </Button>
            ) : (
              <div className="flex h-9 max-w-36 shrink-0 items-center gap-0.5 rounded-md bg-muted px-0.5 sm:h-7 sm:gap-1 sm:px-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 sm:h-5 sm:w-5">
                  <UserIcon className="w-3 h-3 text-primary" />
                </div>
                <span className="hidden max-w-20 truncate text-[11px] font-medium sm:block">{getUserDisplayName(currentUser)}</span>
                <UserNameEditor user={currentUser} onSaved={setCurrentUser} />
                <button
                  onClick={() => base44.auth.logout()}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive sm:h-5 sm:w-5"
                  title="ログアウト"
                  aria-label="ログアウト"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sm:flex">
        {!isGuest && (
          <SidebarNav tabs={navItems} activeTab={activeTab} onSelectTab={handleSelect} topOffset={56} />
        )}
        <div className="flex-1 min-w-0 pb-16 sm:pb-0">{children}</div>
      </div>

      {/* モバイル用グローバルナビ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md safe-area-bottom sm:hidden">
        <div className="grid min-h-14" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
          {navItems.map(({ id, label, short, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={`flex min-w-0 select-none flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 transition-colors ${
                activeTab === id ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={activeTab === id ? "page" : undefined}
              aria-label={label}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate text-[10px] font-medium leading-none">{short || label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}