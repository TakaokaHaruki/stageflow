import { useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getUserDisplayName } from "@/components/UserNameEditor";

function getJSTDateTime() {
  return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).replace("T", " ").slice(0, 16);
}

/**
 * 操作ログ記録フック
 * record(entry) で非同期にログ保存（失敗しても無視）
 */
export function useOperationLog(eventId) {
  const actorRef = useRef(null);

  // 操作者情報を取得（auth.me()のみ使用 - User.filterはRLS制限で他ユーザー取得不可）
  const getActor = useCallback(async () => {
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
   * @param {string} entry.action_type
   * @param {string} entry.description
   * @param {string} [entry.entity_type]
   * @param {string} [entry.entity_id]
   * @param {Object} [entry.snapshot_before]
   * @param {Object} [entry.snapshot_after]
   */
  const record = useCallback(async (entry) => {
    if (!eventId) return;
    try {
      const actor = await getActor();
      await base44.entities.OperationLog.create({
        event_id: eventId,
        action_type: entry.action_type,
        description: entry.description,
        actor_name: actor.name,
        actor_email: actor.email,
        entity_type: entry.entity_type || "",
        entity_id: entry.entity_id || "",
        snapshot_before: entry.snapshot_before || {},
        snapshot_after: entry.snapshot_after || {},
        is_undone: false,
        logged_at_jst: getJSTDateTime(),
      });
    } catch {
      // ログ保存失敗は無視
    }
  }, [eventId, getActor]);

  return { record };
}