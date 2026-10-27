/**
 * 管理者設定の2段ナビゲーション。
 * 似た機能をグループ化し、選択中グループの子項目のみを表示してタブ増殖を防ぐ。
 */
export default function AdminSettingsNav({ groups, activeSection, onSelect, className = "" }) {
  const activeGroup = groups.find((g) => g.children.some((c) => c.id === activeSection)) ?? groups[0];

  return (
    <div className={`sticky top-[var(--app-header-height)] z-40 mb-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${className}`}>
      <div className="flex flex-wrap gap-1 p-1.5">
        {groups.map((group) => {
          const Icon = group.icon;
          const isActive = group.id === activeGroup.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelect(group.children[0].id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{group.label}</span>
              {group.children.length > 1 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold ${
                    isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {group.children.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeGroup.children.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border/60 bg-muted/30 px-1.5 py-1.5">
          {activeGroup.children.map((child) => {
            const isActive = child.id === activeSection;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => onSelect(child.id)}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "border border-primary/30 bg-primary/10 text-primary"
                    : "border border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {child.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}