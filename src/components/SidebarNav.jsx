import { useState } from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const EXPANDED_WIDTH = 168;
const COLLAPSED_WIDTH = 48;

export const SIDEBAR_EXPANDED_WIDTH = EXPANDED_WIDTH;
export const SIDEBAR_COLLAPSED_WIDTH = COLLAPSED_WIDTH;

/**
 * ホバーで開くオーバーレイ式サイドバー。
 * - 折りたたみ時: 左端に 48px の細いレールを固定表示（本文は pl-12 で確保）
 * - 展開時: 168px で本文に重ねて表示（本文は押しつぶさない）
 * - 展開時はトップバー以外の表示領域を軽くぼかす
 */
export default function SidebarNav({ tabs, activeTab, onSelectTab, topOffset = 56, extraNavItems }) {
  const [collapsed, setCollapsed] = useState(true);
  const expanded = !collapsed;
  const top = `calc(var(--device-banner-height, 0px) + ${topOffset}px)`;
  const height = `calc(100vh - var(--device-banner-height, 0px) - ${topOffset}px)`;

  return (
    <>
      {/* 展開時のぼかしオーバーレイ（トップバー以外を覆う） */}
      <div
        className={`hidden sm:block fixed left-0 right-0 bottom-0 z-30 pointer-events-none transition-opacity duration-150 bg-black/5 dark:bg-black/25 backdrop-blur-sm ${expanded ? "opacity-100" : "opacity-0"}`}
        style={{ top }}
        aria-hidden="true"
      />

      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        className="hidden sm:flex fixed left-0 flex-col border-r border-border bg-card dark:bg-card z-40 transition-[width] duration-150"
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH, top, height }}
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden pt-1.5 pb-2 scrollbar-hide">
          <TooltipProvider delayDuration={200}>
            <ul className="flex flex-col gap-0.5 px-1.5">
              {tabs.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                const button = (
                  <button
                    onClick={() => onSelectTab(id)}
                    className={`relative flex w-full items-center rounded-md py-1.5 text-xs font-semibold transition-colors ${
                      collapsed ? "justify-center" : "gap-2.5 px-2.5 pr-2"
                    } ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <span className="absolute -left-1.5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-sidebar-primary" />
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
    </>
  );
}