import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { X, Search, Check } from "lucide-react";
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
    <motion.div
      className="fixed inset-0 z-[60] h-[100dvh] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col max-h-[80vh]"
        initial={{ y: 34, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-bold">アイコンを選ぶ</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="アイコン名で検索..."
              className="w-full h-8 rounded-lg border border-input bg-transparent pl-8 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
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
      </motion.div>
    </motion.div>
  );
}