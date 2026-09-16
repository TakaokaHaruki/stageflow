import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Info, X } from "lucide-react";

const DISMISS_KEY = "crewly_dismissed_notif_";

export default function UserNotificationBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["userNotifications", "active"],
    queryFn: () => base44.entities.UserNotification.filter({ is_active: true }, "-created_date", 50),
    refetchInterval: 30000,
    enabled: !!user,
  });

  if (!user) return null;

  const visible = notifications.filter((n) => {
    if (localStorage.getItem(DISMISS_KEY + n.id) === "1") return false;
    const byRole = n.target_roles?.length > 0;
    const byUser = n.target_user_ids?.length > 0;
    if (!byRole && !byUser) return true;
    if (byRole && n.target_roles.includes(user.role)) return true;
    if (byUser && n.target_user_ids.includes(user.id)) return true;
    return false;
  });

  if (visible.length === 0) return null;

  const dismiss = (id) => {
    localStorage.setItem(DISMISS_KEY + id, "1");
    queryClient.invalidateQueries({ queryKey: ["userNotifications", "active"] });
  };

  return (
    <div className="space-y-0">
      {visible.map((n) => (
        <div
          key={n.id}
          className="bg-sky-50 dark:bg-sky-950/40 border-b border-sky-200 dark:border-sky-800/40 px-3 py-2 flex items-start gap-2"
        >
          <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {n.title && (
              <p className="text-sm font-bold text-sky-800 dark:text-sky-200 leading-snug">{n.title}</p>
            )}
            <p className="text-sm text-sky-800 dark:text-sky-200 leading-relaxed whitespace-pre-wrap">{n.message}</p>
          </div>
          <button
            onClick={() => dismiss(n.id)}
            className="shrink-0 text-sky-600 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-100 transition-colors"
            aria-label="通知を閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}