import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { toJstString, ONLINE_WINDOW_MS } from "@/lib/presenceTime";

const HEARTBEAT_INTERVAL = 20_000;

/**
 * 編集中ユーザーの在席管理フック。
 * - canEdit（管理者・チーフ）の場合、自分の在席レコードをハートビート更新。
 * - 同イベントの在席レコードを購読し、presences として返す。
 * - reportActivity で操作時にレコードを更新（操作中の強調・対象ポジションの印に使用）。
 */
export function useEditingPresence(eventId, tab, { canEdit = false } = {}) {
  const [presences, setPresences] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const myPresenceIdRef = useRef(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  // 自分のユーザー情報取得
  useEffect(() => {
    base44.auth.me().then((u) => setCurrentUserId(u?.id ?? null)).catch(() => {});
  }, []);

  // 在席レコードの取得（全ユーザー向け：バナー表示用）
  const refresh = useCallback(async () => {
    if (!eventId) return;
    try {
      const list = await base44.entities.EditingPresence.filter({ event_id: eventId, is_active: true });
      setPresences(Array.isArray(list) ? list : []);
    } catch {
      setPresences([]);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return undefined;
    let active = true;

    refresh();

    // 在席レコードの変更を購読して即時反映
    let unsub = null;
    try {
      unsub = base44.entities.EditingPresence.subscribe(() => {
        if (active) refresh();
      });
    } catch {
      unsub = null;
    }

    return () => {
      active = false;
      if (unsub) { try { unsub(); } catch {} }
    };
  }, [eventId, refresh]);

  // 自分の在席レコード管理（canEdit のみ）
  useEffect(() => {
    if (!eventId || !canEdit) return undefined;
    let active = true;
    let hbTimer = null;
    let unsub = null;

    const upsert = async () => {
      let user;
      try {
        user = await base44.auth.me();
      } catch {
        return;
      }
      if (!user || !active) return;
      const now = toJstString();
      try {
        const existing = await base44.entities.EditingPresence.filter({ event_id: eventId, user_id: user.id });
        const rec = existing?.[0];
        if (rec) {
          await base44.entities.EditingPresence.update(rec.id, {
            tab: tabRef.current,
            last_heartbeat_at_jst: now,
            is_active: true,
          });
          myPresenceIdRef.current = rec.id;
        } else {
          const created = await base44.entities.EditingPresence.create({
            event_id: eventId,
            user_id: user.id,
            user_name: user.full_name || user.email || "－",
            role: user.role || "",
            tab: tabRef.current,
            last_heartbeat_at_jst: now,
            last_active_at_jst: now,
            is_active: true,
          });
          myPresenceIdRef.current = created?.id ?? null;
        }
      } catch {}
    };

    upsert();
    hbTimer = setInterval(upsert, HEARTBEAT_INTERVAL);

    const markInactive = () => {
      const id = myPresenceIdRef.current;
      if (!id) return;
      try { base44.entities.EditingPresence.update(id, { is_active: false }).catch(() => {}); } catch {}
    };
    const handleLeave = () => markInactive();

    window.addEventListener("beforeunload", handleLeave);

    return () => {
      active = false;
      if (hbTimer) clearInterval(hbTimer);
      window.removeEventListener("beforeunload", handleLeave);
      markInactive();
    };
  }, [eventId, canEdit]);

  const reportActivity = useCallback(({ positionId = "", staffName = "" } = {}) => {
    const id = myPresenceIdRef.current;
    if (!id) return;
    const now = toJstString();
    try {
      base44.entities.EditingPresence.update(id, {
        last_active_at_jst: now,
        active_position_id: positionId,
        active_staff_name: staffName,
        tab: tabRef.current,
      }).catch(() => {});
    } catch {}
  }, []);

  return { presences, currentUserId, reportActivity };
}