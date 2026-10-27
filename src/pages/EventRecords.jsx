import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Camera, ListOrdered, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import SectionTabBar from "@/components/SectionTabBar";
import EventRecordCard from "@/components/records/EventRecordCard";
import { RECORD_CATEGORIES } from "@/lib/eventRecordCategories";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { formatJaDate } from "@/lib/dateFormat";

const VIEW_MODES = [
  { id: "all", label: "全体の記録", icon: ListOrdered },
  { id: "event", label: "イベント別", icon: CalendarDays },
];

export default function EventRecords() {
  const [mode, setMode] = useState("all");
  const [category, setCategory] = useState("すべて");
  const [search, setSearch] = useState("");
  const [eventId, setEventId] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["event-records"],
    queryFn: () => base44.entities.EventRecord.list("-created_date", 300),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  // イベント別ビューの選択肢（記録が存在するイベントのみ）
  const eventOptions = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      if (!r.event_id || map.has(r.event_id)) return;
      map.set(r.event_id, { id: r.event_id, name: r.event_name || "名称未設定のイベント", date: r.event_date || "" });
    });
    return [...map.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [records]);

  const activeEventId = eventId || eventOptions[0]?.id || "";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (mode === "event" && r.event_id !== activeEventId) return false;
      if (category !== "すべて" && (r.category || "その他") !== category) return false;
      if (!q) return true;
      return [r.memo, r.event_name, r.author_name].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [records, mode, activeEventId, category, search]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const key = r.event_date || (r.created_date || "").slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 px-2 py-2">
      <SectionTabBar items={VIEW_MODES} activeId={mode} onSelect={setMode} className="rounded-lg" />

      {mode === "event" && eventOptions.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {eventOptions.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => setEventId(ev.id)}
              className={`flex shrink-0 flex-col items-start rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                activeEventId === ev.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="max-w-40 truncate text-xs font-semibold">{ev.name}</span>
              {ev.date && <span className="text-[10px]">{formatJaDate(ev.date)}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="メモ・イベント名・投稿者で検索"
            className="h-9 pl-8 pr-8 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="検索をクリア"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {["すべて", ...RECORD_CATEGORIES.map((c) => c.name)].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`min-h-8 shrink-0 rounded-full border px-2.5 text-xs font-medium transition-colors ${
                category === name
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground hover:bg-secondary"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Camera className="mx-auto mb-2 h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">記録がありません</p>
          <p className="mt-1 text-xs">各イベント詳細の「イベント記録」から投稿できます</p>
        </div>
      ) : mode === "all" ? (
        <div className="space-y-4">
          {groups.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-bold">{formatJaDate(date) || date}</p>
                <span className="text-[10px] text-muted-foreground">{items.length}件</span>
              </div>
              {items.map((record) => (
                <EventRecordCard key={record.id} record={record} showEvent />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((record) => (
            <EventRecordCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}