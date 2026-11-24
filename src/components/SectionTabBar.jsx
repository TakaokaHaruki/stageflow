/**
 * 全画面共通のセクションタブバー。
 * 横スクロール＋下線アクティブの統一デザイン。
 */
export default function SectionTabBar({ items, activeId, onSelect, className = "", style }) {
  return (
    <div className={`border-b border-border/70 bg-muted/40 ${className}`} style={style}>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect?.(id)}
            className={`flex min-h-11 shrink-0 select-none items-center justify-start gap-2 whitespace-nowrap border-b-2 px-1.5 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none ${
              activeId === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            aria-current={activeId === id ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}