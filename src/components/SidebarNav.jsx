import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const STORAGE_KEY = "crewly:sidebar:collapsed";
const EXPANDED_WIDTH = 168;
const COLLAPSED_WIDTH = 48;

export const SIDEBAR_EXPANDED_WIDTH = EXPANDED_WIDTH;
export const SIDEBAR_COLLAPSED_WIDTH = COLLAPSED_WIDTH;

export default function SidebarNav({ tabs, activeTab, onSelectTab, topOffset = 56, extraNavItems }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) return true; // デフォルトで折りたたむ
      return stored === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <aside
      className="hidden sm:flex sticky self-start flex-col border-r border-border bg-card/80 backdrop-blur-md"
      style={{ width, top: topOffset, height: `calc(100vh - ${topOffset}px)`, transition: "width 200ms ease" }}
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
        <TooltipProvider delayDuration={200}>
          <ul className="flex flex-col gap-0.5 px-1.5 mb-2">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const button = (
                <button
                  onClick={() => { onSelectTab(id); setCollapsed(true); }}
                  className={`relative flex w-full items-center gap-2.5 rounded-md py-2 pr-2 text-xs font-semibold transition-colors ${
                    collapsed ? "justify-center px-0" : "px-2.5"
                  } ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate text-left">{label}</span>}
                </button>
              );

              if (collapsed) {
                return (
                  <li key={id}>
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }
              return <li key={id}>{button}</li>;
            })}
          </ul>
          {extraNavItems}
        </TooltipProvider>
      </nav>

      <div className="border-t border-border p-1.5">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={collapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"}
        >
          <ChevronLeft
            className="h-4 w-4 transition-transform"
            style={{ transform: collapsed ? "rotate(180deg)" : "none" }}
          />
          {!collapsed && <span>折りたたむ</span>}
        </button>
      </div>
    </aside>
  );
}