import { useState } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const EXPANDED_WIDTH = 168;
const COLLAPSED_WIDTH = 48;

export const SIDEBAR_EXPANDED_WIDTH = EXPANDED_WIDTH;
export const SIDEBAR_COLLAPSED_WIDTH = COLLAPSED_WIDTH;

/**
 * ホバーで開くサイドバー。本文レイアウトを動かさないよう、
 * 展開時はオーバーレイ（絶対配置）でラベルを重ねて表示する。
 */
export default function SidebarNav({ tabs, activeTab, onSelectTab, topOffset = 56, extraNavItems }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className="hidden sm:flex sticky self-start flex-col border-r border-border bg-card/80 backdrop-blur-md z-40"
      style={{ width: COLLAPSED_WIDTH, top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
    >
      {/* 展開パネル（オーバーレイ・本文は動かない） */}
      {!collapsed && (
        <div className="absolute inset-y-0 left-0 z-50 flex w-[168px] flex-col border-r border-border bg-card shadow-xl">
          <div className="flex justify-end px-1.5 pt-1.5">
            <button
              onClick={() => setCollapsed(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="サイドバーを閉じる"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
            <ul className="flex flex-col gap-0.5 px-1.5 mb-2">
              {tabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <li key={id}>
                    <button
                      onClick={() => onSelectTab(id)}
                      className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 pr-2 text-xs font-semibold transition-colors ${
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
                      <span className="truncate text-left">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {extraNavItems}
          </nav>
        </div>
      )}

      {/* 常設のアイコンレール */}
      <div className="flex justify-end px-1.5 pt-1.5">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCollapsed(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="サイドバーを開く"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">サイドバーを開く</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-hide">
        <TooltipProvider delayDuration={200}>
          <ul className="flex flex-col gap-0.5 px-1.5 mb-2">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <li key={id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onSelectTab(id)}
                        className={`relative flex w-full items-center justify-center rounded-md py-2 text-xs font-semibold transition-colors ${
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
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
                  </Tooltip>
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