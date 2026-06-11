import { useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getUserDisplayName } from "@/components/UserNameEditor";

/**
 * 閲覧ログ記録フック
 * record(entry) で非同期にログ保存（失敗しても無視）
 */
export function useViewLog(eventId) {
  const actorRef = useRef(null);

  const getActor = useCallback(async () => {
    if (actorRef.current) return actorRef.current;
    try {
      const user = await base44.auth.me();
      const displayName = getUserDisplayName(user) || user?.email?.split("@")[0] || "不明";
      actorRef.current = { name: displayName, email: user?.email || "" };
    } catch {
      actorRef.current = { name: "不明", email: "" };
    }
    return actorRef.current;
  }, []);

  /**
   * @param {Object} entry
   * @param {string} entry.view_type  - 'announcement_open' | 'file_open' | 'tab_open' | 'item_expand'
   * @param {string} entry.target_title
   * @param {string} [entry.target_id]
   */
  const record = useCallback(async (entry) => {
    if (!eventId) return;
    try {
      const actor = await getActor();
      await base44.entities.ViewLog.create({
        event_id: eventId,
        view_type: entry.view_type,
        target_title: entry.target_title,
        target_id: entry.target_id || "",
        actor_name: actor.name,
        actor_email: actor.email,
      });
    } catch {
      // 閲覧ログ保存失敗は無視
    }
  }, [eventId, getActor]);

  return { record };
}