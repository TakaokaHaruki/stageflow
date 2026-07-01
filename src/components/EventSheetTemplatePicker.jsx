import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Calendar, X, Copy, Loader2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function EventSheetTemplatePicker({ eventId, onCopy, onClose }) {
  const [search, setSearch] = useState("");

  // Fetch all events to find ones with sheets
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["eventsForTemplate"],
    queryFn: () => base44.entities.Event.list(),
  });

  // Fetch all event sheets
  const { data: allSheets = [], isLoading: sheetsLoading } = useQuery({
    queryKey: ["allEventSheets"],
    queryFn: () => base44.entities.EventSheet.list("-updated_date", 200),
  });

  const isLoading = eventsLoading || sheetsLoading;

  // Build a map of event_id -> sheet (with custom_notes)
  const sheetMap = useMemo(() => {
    const map = {};
    for (const s of allSheets) {
      if (!s.custom_notes) continue;
      // Keep most recent sheet per event
      if (!map[s.event_id] || new Date(s.updated_date) > new Date(map[s.event_id].updated_date)) {
        map[s.event_id] = s;
      }
    }
    return map;
  }, [allSheets]);

  // Filter: only events with sheets, excluding current event, matching search
  const templateEvents = useMemo(() => {
    return events
      .filter((e) => e.id !== eventId && sheetMap[e.id])
      .filter((e) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          e.name?.toLowerCase().includes(q) ||
          e.venue?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Sort by date descending (most recent first)
        const da = a.date ? new Date(a.date) : new Date(0);
        const db = b.date ? new Date(b.date) : new Date(0);
        return db - da;
      });
  }, [events, sheetMap, eventId, search]);

  const handleSelect = (event) => {
    const sheet = sheetMap[event.id];
    if (!sheet?.custom_notes) return;
    onCopy(sheet.custom_notes);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Copy className="w-4 h-4" />
            過去の公演シートからコピー
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-muted-foreground"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="イベント名・会場で検索"
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templateEvents.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              コピー元の公演シートが見つかりません
            </div>
          ) : (
            templateEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => handleSelect(event)}
                className="w-full flex items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-accent/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Calendar className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                    {event.date && (
                      <span>{format(new Date(event.date), "yyyy年M月d日（E）", { locale: ja })}</span>
                    )}
                    {event.venue && <span>{event.venue}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {sheetMap[event.id]?.custom_notes?.slice(0, 80) || ""}
                    {(sheetMap[event.id]?.custom_notes?.length || 0) > 80 ? "..." : ""}
                  </p>
                </div>
                <Copy className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}