import { useState, useEffect } from "react";
import { Plus, ShieldCheck, LogOut, User, Trash2, LogIn, MoreHorizontal, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import ThemeToggle from "@/components/ThemeToggle";
import UserNameEditor, { getUserDisplayName } from "@/components/UserNameEditor";

const STORAGE_KEY = "crewly:events-sidebar:collapsed";
const EXPANDED_WIDTH = 200;
const COLLAPSED_WIDTH = 52;

export default function EventsSidebar({ canEdit, isAdmin, isGuest, currentUser, setCurrentUser, onNewEvent, onAdminSettings, onLogout, onLogin, onDeleteAccount }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch { return true; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const actionItems = [
    ...(canEdit ? [{ id: "new", label: "新規イベント", icon: Plus, onClick: onNewEvent }] : []),
    ...(isAdmin ? [{ id: "admin", label: "管理者設定", icon: ShieldCheck, onClick: onAdminSettings }] : []),
  ];

  const desktopSidebar = (
    <aside
      className="hidden sm:flex sticky self-start flex-col border-r border-border bg-card/80 backdrop-blur-md"
      style={{ width, top: 56, height: "calc(100vh - 56px)", transition: "width 200ms ease" }}
    >
      <TooltipProvider delayDuration={200}>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
          <ul className="flex flex-col gap-0.5 px-1.5">
            {actionItems.map(({ id, label, icon: Icon, onClick }) => {
              const button = (
                <button
                  onClick={onClick}
                  className={`relative flex w-full items-center gap-2.5 rounded-md py-2 pr-2 text-xs font-semibold transition-colors text-muted-foreground hover:bg-muted hover:text-foreground ${collapsed ? "justify-center px-0" : "px-2.5"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate text-left">{label}</span>}
                </button>
              );
              if (collapsed) {
                return (
                  <li key={id}>
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              }
              return <li key={id}>{button}</li>;
            })}
          </ul>
      </nav>

      <div className="border-t border-border p-1.5 space-y-1.5">
        <div className={`flex ${collapsed ? "justify-center" : "items-center gap-2 px-1"}`}>
          <ThemeToggle />
          {!collapsed && <span className="text-xs text-muted-foreground">テーマ</span>}
        </div>

        {currentUser ? (
          <div className={`flex items-center gap-1 ${collapsed ? "justify-center" : "px-1"}`}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
              <User className="w-3 h-3 text-primary" />
            </div>
            {!collapsed && (
              <span className="flex-1 min-w-0 truncate text-[11px] font-medium">{getUserDisplayName(currentUser)}</span>
            )}
            {!collapsed && (
              <div className="flex shrink-0 gap-0.5">
                <UserNameEditor user={currentUser} onSaved={setCurrentUser} />
                <button onClick={onDeleteAccount} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive" title="アカウント削除"><Trash2 className="h-3 w-3" /></button>
                <button onClick={onLogout} className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive" title="ログアウト"><LogOut className="h-3 w-3" /></button>
              </div>
            )}
            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onLogout} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive" title="ログアウト"><LogOut className="h-3 w-3" /></button>
                </TooltipTrigger>
                <TooltipContent side="right">{getUserDisplayName(currentUser)}</TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <Button size="sm" variant="outline" className="gap-1 text-xs w-full" onClick={onLogin}>
            <LogIn className="w-3 h-3" />{!collapsed && "ログイン"}
          </Button>
        )}
      </div>

      <div className="border-t border-border p-1.5">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          <ChevronLeft className="h-4 w-4 transition-transform" style={{ transform: collapsed ? "rotate(180deg)" : "none" }} />
          {!collapsed && <span>折りたたむ</span>}
        </button>
      </div>
      </TooltipProvider>
    </aside>
  );

  const mobileDrawer = (
    <div className="sm:hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-2 right-2 rounded-lg border border-border bg-card p-1.5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">メニュー</span>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setMobileOpen(false)} aria-label="閉じる"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1">
              {canEdit && (
                <button type="button" onClick={() => { setMobileOpen(false); onNewEvent(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-muted">
                  <Plus className="h-4 w-4 shrink-0" />新規イベント
                </button>
              )}
              {isAdmin && (
                <button type="button" onClick={() => { setMobileOpen(false); onAdminSettings(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-xs font-semibold text-foreground hover:bg-muted">
                  <ShieldCheck className="h-4 w-4 shrink-0" />管理者設定
                </button>
              )}
              <div className="flex items-center gap-2 rounded-md px-2.5 py-2.5">
                <ThemeToggle />
                <span className="text-xs font-semibold text-foreground">テーマ切替</span>
              </div>
              {currentUser ? (
                <div className="border-t border-border pt-1.5 mt-1.5 space-y-1">
                  <div className="flex items-center gap-2 px-2.5 py-1.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20"><User className="w-3 h-3 text-primary" /></div>
                    <span className="flex-1 truncate text-xs font-medium">{getUserDisplayName(currentUser)}</span>
                    <UserNameEditor user={currentUser} onSaved={setCurrentUser} />
                  </div>
                  <button type="button" onClick={() => { setMobileOpen(false); onDeleteAccount(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />アカウント削除
                  </button>
                  <button type="button" onClick={() => { setMobileOpen(false); onLogout(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">
                    <LogOut className="h-3.5 w-3.5" />ログアウト
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => { setMobileOpen(false); onLogin(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-xs font-semibold text-primary hover:bg-primary/10">
                  <LogIn className="h-4 w-4 shrink-0" />ログイン
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md safe-area-bottom">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full min-h-14 flex-col items-center justify-center gap-0.5 text-muted-foreground"
          aria-label="メニュー"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">メニュー</span>
        </button>
      </div>
    </div>
  );

  return (<>
    {desktopSidebar}
    {mobileDrawer}
  </>);
}