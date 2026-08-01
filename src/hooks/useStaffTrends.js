import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TIME_SLOTS } from "@/lib/constants";

const SLOT_ORDER = ["開場中", "開演中", "終演後"];

function normalizeSlot(slot) {
  return slot === "開場前" ? "開場中" : slot || "開場中";
}

/**
 * 直近10イベントから、スタッフ名ごと・時間帯ごとのポジション出現回数を集計する。
 * 戻り値: {
 *   tally: { [staffName]: { "開場中": { posName: count }, "開演中": {...}, "終演後": {...} } },
 *   recentEvents: Event[]
 * }
 */
export function useStaffTrends(eventId) {
  const { data = { tally: {}, recentEvents: [], positionsPerEvent: [] }, isLoading, isFetching } = useQuery({
    queryKey: ["staffTrends", eventId || null],
    queryFn: async () => {
      const events = await base44.entities.Event.list("-date", 200);
      // 現在のイベントを除外して過去履歴のみを対象にする
      const recentEvents = (eventId
        ? (events || []).filter((e) => e.id !== eventId)
        : events || []
      ).slice(0, 10);

      if (recentEvents.length === 0) return { tally: {}, recentEvents: [], positionsPerEvent: [] };

      const positionsPerEvent = await Promise.all(
        recentEvents.map((e) => base44.entities.Position.filter({ event_id: e.id }))
      );
      const allPositions = positionsPerEvent.flat();

      const tally = {};
      allPositions.forEach((pos) => {
        const slot = normalizeSlot(pos.time_slot);
        const names = pos.split_by_side
          ? [...new Set([...(pos.staff_names_kamite || []), ...(pos.staff_names_shimote || [])])]
          : (pos.staff_names || []);
        const posName = pos.name || pos.role || "";
        if (!posName) return;
        names.forEach((n) => {
          if (!tally[n]) tally[n] = {};
          if (!tally[n][slot]) tally[n][slot] = {};
          tally[n][slot][posName] = (tally[n][slot][posName] || 0) + 1;
        });
      });

      return { tally, recentEvents, positionsPerEvent };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => ({ ...data, isLoading, isFetching }), [data, isLoading, isFetching]);
}

export { SLOT_ORDER };