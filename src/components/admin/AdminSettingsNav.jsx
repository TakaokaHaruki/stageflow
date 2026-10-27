import SectionTabBar from "@/components/SectionTabBar";

/**
 * 管理者設定の2段ナビゲーション。
 * どちらも全画面共通の SectionTabBar を使い、子タブはインデントで階層を表現する。
 */
export default function AdminSettingsNav({ groups, activeSection, onSelect, className = "" }) {
  const activeGroup = groups.find((g) => g.children.some((c) => c.id === activeSection)) ?? groups[0];
  const groupItems = groups.map(({ id, label, icon }) => ({ id, label, icon }));

  return (
    <div className={`sticky top-[var(--app-header-height)] z-40 mb-3 border-b border-border/70 bg-muted/40 ${className}`}>
      <SectionTabBar
        items={groupItems}
        activeId={activeGroup.id}
        onSelect={(groupId) => {
          const group = groups.find((g) => g.id === groupId);
          if (group) onSelect(group.children[0].id);
        }}
        className="border-b-0"
      />
      {activeGroup.children.length > 1 && (
        <SectionTabBar
          items={activeGroup.children}
          activeId={activeSection}
          onSelect={onSelect}
          className="pl-3 sm:pl-4"
        />
      )}
    </div>
  );
}