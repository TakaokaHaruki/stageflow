import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, ChevronDown } from "lucide-react";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";

const PRIORITY_STYLES = {
  "通常": "bg-muted text-muted-foreground border-border",
  "重要": "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  "緊急": "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700",
};

/**
 * スタッフポータル用のお知らせカード。自分宛てのお知らせを未読バッジ付きで表示し、
 * 開いたお知らせは既読化する。更新は手動更新ボタンに合わせる（自動ポーリングはしない）。
 */
export default function PortalAnnouncementsCard({ events, staffName }) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState(null);
  const eventsKey = events.map((e) => e.id).sort().join(",");

  const { data: announcements = [] } = useQuery({
    queryKey: ["portal-announcements", staffName, eventsKey],
    queryFn: async () => {
      const results = [];
      for (const ev of events) {
        const items = await base44.entities.Announcement.filter({ event_id: ev.id });
        for (const a of items) {
          if ((a.target_staff || []).length === 0 || a.target_staff.includes(staffName)) {
            results.push({ ...a, _eventName: ev.name });
          }
        }
      }
      return results.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
    },
    enabled: !!staffName && events.length > 0,
  });

  if (announcements.length === 0) return null;

  const unreadCount = announcements.filter((a) => !(a.read_by || []).includes(staffName)).length;

  const handleToggle = async (item) => {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    if (!(item.read_by || []).includes(staffName)) {
      try {
        await base44.entities.Announcement.update(item.id, { read_by: [...(item.read_by || []), staffName] });
        queryClient.invalidateQueries({ queryKey: ["portal-announcements", staffName, eventsKey] });
      } catch {}
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-md">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold">
          <Bell className="h-4 w-4 text-muted-foreground" />お知らせ
        </h3>
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            未読 {unreadCount}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {announcements.map((item) => {
          const isUnread = !(item.read_by || []).includes(staffName);
          const priority = PRIORITY_STYLES[item.priority] || PRIORITY_STYLES["通常"];
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-lg border px-2.5 py-2 ${isUnread ? "border-primary/40 bg-primary/5" : "border-border"}`}
            >
              <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => handleToggle(item)}>
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${priority}`}>
                  {item.priority || "通常"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.title}</span>
                {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="未読" />}
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="mt-1.5 border-t border-border pt-1.5">
                  {events.length > 1 && item._eventName && (
                    <p className="mb-1 text-[10px] font-medium text-muted-foreground">{item._eventName}</p>
                  )}
                  <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}