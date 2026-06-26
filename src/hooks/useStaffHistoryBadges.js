import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TIME_SLOTS } from "@/lib/constants";

const SLOT_ORDER = ["開場中", "開演中", "終演後"];

function normalizeSlot(slot) {
  return slot === "開場前" ? "開場中" : slot || "開場中";
}

/**
 * 過去イベント直近5件から、スタッフ名ごと・時間帯ごとの最頻ポジション名を集計する。
 * 戻り値: { [staffName]: { "開場中": "もぎり", "開演中": "案内", ... } }
 */
export function useStaffHistoryBadges(eventId) {
  const { data: historyMap = {} } = useQuery({
    queryKey: ["staffHistoryBadges", eventId],
    queryFn: async () => {
      // Event一覧をdate降順で取得
      const events = await base44.entities.Event.list("-date", 200);
      const recentEvents = (events || [])
        .filter((e) => e.id !== eventId)
        .slice(0, 10);

      if (recentEvents.length === 0) return {};

      // 5件のイベントのPositionをまとめて取得
      const positionsPerEvent = await Promise.all(
        recentEvents.map((e) => base44.entities.Position.filter({ event_id: e.id }))
      );
      const allPositions = positionsPerEvent.flat();

      // staffName -> slot -> { posName -> count }
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

      // 各staffName・各slotの最頻値を選出
      const result = {};
      Object.entries(tally).forEach(([name, slots]) => {
        const slotResult = {};
        TIME_SLOTS.forEach((slot) => {
          const counts = slots[slot];
          if (!counts) return;
          let maxName = null;
          let maxCount = 0;
          Object.entries(counts).forEach(([posName, count]) => {
            if (count > maxCount || (count === maxCount && posName < maxName)) {
              maxName = posName;
              maxCount = count;
            }
          });
          if (maxName) slotResult[slot] = maxName;
        });
        if (Object.keys(slotResult).length > 0) {
          result[name] = slotResult;
        }
      });
      return result;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => historyMap, [historyMap]);
}