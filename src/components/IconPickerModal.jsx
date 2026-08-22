import { useState, useMemo } from "react";
import ModalShell, { ModalHeader } from "@/components/ModalShell";
import { Search } from "lucide-react";
import { ICON_CATALOG } from "@/lib/iconCatalog";

export default function IconPickerModal({ selectedIcon, onSelect, onClose }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ICON_CATALOG;
    const q = search.toLowerCase();
    return ICON_CATALOG.filter(
      (e) => e.name.toLowerCase().includes(q) || e.label.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <ModalHeader title="アイコンを選ぶ" onClose={onClose} />

      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="アイコン名で検索..."
          className="w-full h-8 rounded-lg border border-input bg-transparent pl-8 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="scrollbar-hide">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">該当するアイコンがありません</p>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {filtered.map((entry) => {
              const isSelected = selectedIcon === entry.name;
              return (
                <button
                  key={entry.name}
                  onClick={() => { onSelect(entry.name); onClose(); }}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-colors ${
                    isSelected
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-muted"
                  }`}
                  title={entry.label}
                >
                  <entry.Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-foreground"}`} />
                  <span className={`text-[9px] truncate w-full text-center ${isSelected ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {entry.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}