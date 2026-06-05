import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * スタッフロック状態の管理フック
 */
export function useLockedStaff(eventId, event) {
  const queryClient = useQueryClient();

  const lockedNames = event?.locked_staff_names || [];

  const isLocked = useCallback(
    (staffName) => lockedNames.includes(staffName),
    [lockedNames]
  );

  const toggleLock = useCallback(
    async (staffName) => {
      const current = event?.locked_staff_names || [];
      const next = current.includes(staffName)
        ? current.filter((n) => n !== staffName)
        : [...current, staffName];

      // 楽観的更新
      queryClient.setQueryData(["event", eventId], (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((e) => e.id === eventId ? { ...e, locked_staff_names: next } : e);
        }
        return { ...old, locked_staff_names: next };
      });

      await base44.entities.Event.update(eventId, { locked_staff_names: next });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
    [event, eventId, queryClient]
  );

  const clearAllLocks = useCallback(async () => {
    queryClient.setQueryData(["event", eventId], (old) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return old.map((e) => e.id === eventId ? { ...e, locked_staff_names: [] } : e);
      }
      return { ...old, locked_staff_names: [] };
    });
    await base44.entities.Event.update(eventId, { locked_staff_names: [] });
    queryClient.invalidateQueries({ queryKey: ["event", eventId] });
  }, [eventId, queryClient]);

  return { lockedNames, isLocked, toggleLock, clearAllLocks };
}