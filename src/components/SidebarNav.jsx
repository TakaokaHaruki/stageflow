import { useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const EXPANDED_WIDTH = 168;
const COLLAPSED_WIDTH = 48;

export const SIDEBAR_EXPANDED_WIDTH = EXPANDED_WIDTH;
export const SIDEBAR_COLLAPSED_WIDTH = COLLAPSED_WIDTH;

/**
 * ホバーで開くサイドバー。展開時は本文を押し広げて表示する（内容と重ならない）。
 */
export default function SidebarNav({ tabs, activeTab, onSelectTab, topOffset = 56, extraNavItems }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className="hidden sm:flex sticky self-start flex-col border-r border-border bg-card/80 backdrop-blur-md z-40 transition-[width] duration-150"
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH, top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
    >
      {/* 展開切替 */}
      <div className="flex justify-end px-1.5 pt-1.5">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
        <TooltipProvider delayDuration={200}>
          <ul className="flex flex-col gap-0.5 px-1.5 mb-2">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const button = (
                <button
                  onClick={() => onSelectTab(id)}
                  className={`relative flex w-full items-center rounded-md py-2 text-xs font-semibold transition-colors ${
                    collapsed ? "justify-center" : "gap-2.5 px-2.5 pr-2"
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
              return (
                <li key={id}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  )}
                </li>
              );
            })}
          </ul>
          {extraNavItems}
        </TooltipProvider>
      </nav>
    </aside>
  );
}