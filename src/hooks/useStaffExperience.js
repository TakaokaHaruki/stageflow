import { useMemo } from "react";
import { useStaffTrends } from "@/hooks/useStaffTrends";

/**
 * useStaffTrends の過去ポジション履歴データを再利用し、
 * スタッフ名ごとに「過去に配置されたポジション名のSet」と「過去に配置された属性のSet」を構築する。
 *
 * 経験あり判定:
 *   hasExperience(staffName, positionName, category) →
 *     同じポジション名 または 同じ属性 に1回以上配置されていれば true
 *
 * API追加コールなし（useStaffTrends は React Query でキャッシュ共有）。
 */
export function useStaffExperience() {
  const { positionsPerEvent, isLoading, isFetching } = useStaffTrends();
  const isReady = !isLoading && !isFetching;

  const experienceMap = useMemo(() => {
    const map = {};
    (positionsPerEvent || []).forEach((positions) => {
      (positions || []).forEach((pos) => {
        const names = pos.split_by_side
          ? [...new Set([...(pos.staff_names_kamite || []), ...(pos.staff_names_shimote || [])])]
          : (pos.staff_names || []);
        const posName = pos.name || "";
        const category = pos.category || "";
        names.forEach((n) => {
          if (!map[n]) map[n] = { positionNames: new Set(), categories: new Set() };
          if (posName) map[n].positionNames.add(posName);
          if (category) map[n].categories.add(category);
        });
      });
    });
    return map;
  }, [positionsPerEvent]);

  const hasExperience = useMemo(() => {
    return (staffName, positionName, category) => {
      const exp = experienceMap[staffName];
      if (!exp) return false;
      if (positionName && exp.positionNames.has(positionName)) return true;
      if (category && exp.categories.has(category)) return true;
      return false;
    };
  }, [experienceMap]);

  return { hasExperience, experienceMap, isReady };
}