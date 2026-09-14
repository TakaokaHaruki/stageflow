import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/hooks/useUserRole";

export const EVENT_LIMIT_CONFIG_KEY = "restrict_events_latest2";
export const EVENT_LIMIT_COUNT = 2;

/** 開催日（未設定なら作成日）が新しい順に最新count件のイベントID集合を返す */
export function latestEventIds(events, count = EVENT_LIMIT_COUNT) {
  if (!Array.isArray(events)) return new Set();
  const sorted = [...events].sort((a, b) => {
    const ka = (a.date || a.created_date || "").slice(0, 10);
    const kb = (b.date || b.created_date || "").slice(0, 10);
    return kb.localeCompare(ka);
  });
  return new Set(sorted.slice(0, count).map((e) => e.id));
}

/**
 * 「チーフ権限以下は最新2件のみ閲覧可能」制限の状態を返すフック。
 * limited = 制限ON かつ 現在のユーザーが管理者以外（ロール読み込み中も制限側に倒す）
 * allowedIds = 閲覧を許可するイベントIDの集合（limited=false の場合は参照しない）
 */
export function useEventViewLimit() {
  const { isAdmin } = useUserRole();

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["appConfig", EVENT_LIMIT_CONFIG_KEY],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ key: EVENT_LIMIT_CONFIG_KEY });
      return configs[0] || null;
    },
  });

  const limited = config?.value_bool === true && !isAdmin;

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date"),
    enabled: limited,
  });

  return {
    limited,
    allowedIds: latestEventIds(events),
    isLoading: (configLoading && !config) || (limited && eventsLoading),
  };
}