import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LogIn, LogOut, User as UserIcon, RefreshCw } from "lucide-react";
import CrewlyLogo from "@/components/CrewlyLogo";
import ThemeToggle from "@/components/ThemeToggle";
import SidebarNav from "@/components/SidebarNav";
import GlobalBanner from "@/components/GlobalBanner";
import UserNotificationBanner from "@/components/UserNotificationBanner";
import { getUserDisplayName } from "@/lib/userDisplay";
import { Button } from "@/components/ui/button";
import { getNavItems } from "@/lib/navConfig";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * 全管理画面共通のシェル（レイアウトルート）。
 * ページ遷移時も再マウントされず、ヘッダー・サイドバーは固定のまま
 * コンテンツ（Outlet）だけが即時切り替わる。
 */
export default function AppNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, canEdit } = useUserRole();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileError, setProfileError] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(56);

  // ヘッダーの実際の高さにサイドバーの固定位置を合わせる
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => {
      setHeaderHeight(el.offsetHeight);
      document.documentElement.style.setProperty("--app-header-height", `${el.offsetHeight}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const loadUser = () => {
    setProfileError(false);
    base44.auth.me().then(setCurrentUser).catch(() => setProfileError(true));
  };

  useEffect(() => {
    loadUser();
  }, []);

  // ページ遷移時にスクロール位置をトップへリセット（ブラウザの自動復元を抑止）
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navItems = getNavItems({ isAdmin, canEdit });

  // 表示中ページのタブ・タイトルをルートパスから解決
  const current =
    navItems.find((item) => item.path === location.pathname) ??
    navItems.find((item) => location.pathname.startsWith(`${item.path}/`));
  const activeTab = current?.id;
  const title = current?.label ?? "";

  const handleSelect = (tabId) => {
    const item = navItems.find((i) => i.id === tabId);
    if (item) navigate(item.path);
  };

  return (
    <div className="min-h-screen bg-background safe-area-bottom relative scrollbar-hide overflow-x-clip">
      <GlobalBanner />
      <UserNotificationBanner />
      {/* 共通ヘッダ */}
      <div ref={headerRef} className="bg-card/90 dark:bg-card/80 backdrop-blur-md border-b border-border sticky z-50 safe-area-top" style={{ top: "var(--device-banner-height, 0px)" }}>
        <div className="max-w-[1400px] mx-auto px-3 pb-1.5 pt-1.5 flex items-center gap-2">
          <CrewlyLogo className="mr-1" administrator={isAdmin} />
          <div className="hidden h-5 w-px bg-border sm:block" />
          <h1 className="shrink-0 text-[15px] font-bold tracking-tight text-foreground">{title}</h1>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {profileError ? (
              <Button
                size="sm"
                variant="outline"
                className="h-11 gap-1 px-2 text-xs shrink-0 sm:h-7"
                onClick={loadUser}
              >
                <RefreshCw className="w-3 h-3" />再試行
              </Button>
            ) : !currentUser ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs px-2 shrink-0"
                onClick={() => navigate("/login")}
              >
                <LogIn className="w-3 h-3" />ログイン
              </Button>
            ) : (
              <div className="flex h-11 max-w-40 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1 sm:h-8 sm:gap-1.5 sm:px-1.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 sm:h-6 sm:w-6">
                  <UserIcon className="w-3 h-3 text-primary" />
                </div>
                <span className="hidden max-w-20 truncate text-[11px] font-medium sm:block">{getUserDisplayName(currentUser)}</span>
                <button
                  onClick={() => setConfirmLogout(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive sm:h-6 sm:w-6"
                  title="ログアウト"
                  aria-label="ログアウト"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sm:flex">
        <SidebarNav tabs={navItems} activeTab={activeTab} onSelectTab={handleSelect} topOffset={headerHeight} />
        <div className="flex-1 min-w-0 pb-16 sm:pb-0 sm:pl-14">
          <Outlet />
        </div>
      </div>

      {confirmLogout && (
        <ConfirmDialog
          message="ログアウトしますか？"
          confirmLabel="ログアウト"
          confirmVariant="default"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => { setConfirmLogout(false); base44.auth.logout(); }}
        />
      )}

      {/* モバイル用グローバルナビ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-area-bottom sm:hidden">
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