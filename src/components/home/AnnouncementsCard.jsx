import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, ChevronDown } from "lucide-react";
import { getUserDisplayName } from "@/lib/userDisplay";

const PRIORITY_STYLES = {
  "通常": "bg-muted text-muted-foreground border-border",
  "重要": "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  "緊急": "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700",
};

/**
 * ホームのお知らせカード。未読数バッジ付きで、開いたお知らせは既読化する。
 */
export default function AnnouncementsCard({ eventId, announcements }) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me().catch(() => null),
  });
  const displayName = user ? getUserDisplayName(user) : "";

  const sorted = [...(announcements || [])].sort((a, b) =>
    (b.created_date || "").localeCompare(a.created_date || "")
  );
  const unreadCount = sorted.filter((a) => !(a.read_by || []).includes(displayName)).length;

  if (sorted.length === 0) return null;

  const handleToggle = async (item) => {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    if (displayName && !(item.read_by || []).includes(displayName)) {
      try {
        await base44.entities.Announcement.update(item.id, { read_by: [...(item.read_by || []), displayName] });
        queryClient.invalidateQueries({ queryKey: ["home-announcements", eventId] });
      } catch {}
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />お知らせ
        </h2>
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            未読 {unreadCount}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {sorted.map((item) => {
          const isUnread = !(item.read_by || []).includes(displayName);
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
                <p className="mt-1.5 whitespace-pre-line border-t border-border pt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}