import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * 指定イベントの主要エンティティ（Position / Staff / Event）の変更を
 * リアルタイム購読し、該当クエリを即時無効化して再取得を促す。
 * 従来の refetchInterval ポーリングはフォールバックとして維持される。
 * 購読が動作しない環境でもポーリングで最終的に同期される。
 */
export function useRealtimeSync(eventId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!eventId) return undefined;

    const invalidate = (key) => {
      queryClient.invalidateQueries({ queryKey: key });
    };

    let posUnsub = null;
    let staffUnsub = null;
    let eventUnsub = null;

    try {
      posUnsub = base44.entities.Position.subscribe((event) => {
        if (event?.data?.event_id !== eventId) return;
        invalidate(["positions", eventId]);
      });
    } catch {}
    try {
      staffUnsub = base44.entities.Staff.subscribe((event) => {
        if (event?.data?.event_id !== eventId) return;
        invalidate(["staff", eventId]);
      });
    } catch {}
    try {
      eventUnsub = base44.entities.Event.subscribe((event) => {
        if (event?.data?.id !== eventId) return;
        invalidate(["event", eventId]);
      });
    } catch {}

    return () => {
      [posUnsub, staffUnsub, eventUnsub].forEach((u) => {
        if (u) { try { u(); } catch {} }
      });
    };
  }, [eventId, queryClient]);
}