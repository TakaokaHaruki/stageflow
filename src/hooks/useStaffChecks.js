import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * 表示モード用：ペンライト貸出・弁当確認のチェック状態をイベント共有で保存する。
 * Staff エンティティの penlight_checked / bento_checked に直接保存し、
 * 楽観的に staff クエリキャッシュを更新する。
 */
export function useStaffChecks(eventId) {
  const queryClient = useQueryClient();

  const toggleCheck = useCallback((staffId, field, next) => {
    if (!staffId) return;
    queryClient.setQueryData(["staff", eventId], (old = []) =>
      old.map((s) => (s.id === staffId ? { ...s, [field]: next } : s))
    );
    base44.entities.Staff.update(staffId, { [field]: next }).catch((e) => {
      // 失敗時は元に戻す
      queryClient.setQueryData(["staff", eventId], (old = []) =>
        old.map((s) => (s.id === staffId ? { ...s, [field]: !next } : s))
      );
      console.error("staff check update failed", e);
    });
  }, [eventId, queryClient]);

  return { toggleCheck };
}