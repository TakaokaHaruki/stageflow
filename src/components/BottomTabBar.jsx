import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  Settings,
  ShieldCheck,
  Map,
  LayoutTemplate,
  FileText,
  Paperclip,
  MoreHorizontal,
  X,
} from "lucide-react";

const PRIMARY_TABS = [
  { id: "staff", label: "スタッフ", icon: Users },
  { id: "dragdrop", label: "配置表", icon: ClipboardList },
  { id: "map", label: "配置マップ", icon: Map },
  { id: "seating_map", label: "客席図", icon: LayoutTemplate },
];

const MORE_TABS = [
  { id: "pos_notes", label: "ポジション説明", icon: FileText, privileged: true },
  { id: "files", label: "配布資料", icon: Paperclip, privileged: true },
  { id: "admin", label: "管理者設定", icon: ShieldCheck, admin: true },
  { id: "settings", label: "管理設定", icon: Settings, privileged: true },
];
// pos_notes は settings の子タブに移動済み

export default function BottomTabBar({ activeTab, onTabChange, onActiveTabReset, isPrivileged = true, isAdmin = false }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTabs = MORE_TABS.filter((tab) => (!tab.admin || isAdmin) && (!tab.privileged || isPrivileged));
  const isMoreActive = moreTabs.some((tab) => tab.id === activeTab);

  useEffect(() => {
    setMoreOpen(false);
  }, [activeTab]);

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) {
      onActiveTabReset?.(tabId);
      onTabChange(tabId, { replace: true, reset: true });
      return;
    }
    onTabChange(tabId);
  };

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-2 right-2 rounded-lg border border-border bg-card p-1.5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-muted-foreground">その他のメニュー</span>
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
              {moreTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTabClick(id)}
                  className={`flex min-h-10 items-center gap-2 rounded-md border px-2.5 text-left text-xs font-semibold ${
                    activeTab === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-md safe-area-bottom">
        <div className="grid min-h-14 grid-cols-6">
          {PRIMARY_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabClick(id)}
              className={`flex min-w-0 select-none flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 transition-colors focus-visible:outline-none ${
                activeTab === id ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={activeTab === id ? "page" : undefined}
              aria-label={label}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className="max-w-full truncate text-[10px] font-medium leading-none">{label}</span>
            </button>
          ))}
          {moreTabs.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className={`flex min-w-0 select-none flex-col items-center justify-center gap-0.5 px-0.5 py-0.5 transition-colors focus-visible:outline-none ${
                isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground"
              }`}
              aria-expanded={moreOpen}
              aria-label="その他"
            >
              <MoreHorizontal className="h-4.5 w-4.5 shrink-0" />
              <span className="text-[10px] font-medium leading-none">その他</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}