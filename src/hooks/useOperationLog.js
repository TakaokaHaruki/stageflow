import { useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { getUserDisplayName } from "@/components/UserNameEditor";

/**
 * 操作ログ記録フック
 * record(entry) で非同期にログ保存（失敗しても無視）
 */
export function useOperationLog(eventId) {
  const actorRef = useRef(null);

  // 操作者情報を取得（常に最新の表示名を使う）
  const getActor = useCallback(async () => {
    try {
      const user = await base44.auth.me();
      // User エンティティから username（個別表示名）を含む最新情報を取得
      const users = await base44.entities.User.filter({ id: user?.id });
      const fullUser = users?.[0] || user;
      actorRef.current = { name: getUserDisplayName(fullUser) || "不明", email: fullUser?.email || "" };
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
      });
    } catch {
      // ログ保存失敗は無視
    }
  }, [eventId, getActor]);

  return { record };
}