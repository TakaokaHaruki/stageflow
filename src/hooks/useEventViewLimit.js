import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const EVENT_LIMIT_CONFIG_KEY = "restrict_events_latest2";
export const EVENT_LIMIT_COUNT = 2;

export function getTodayJST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60000).toISOString().split("T")[0];
}

/**
 * 閲覧を許可するイベントIDの集合。
 * 今後のイベント（本日以降・日付未設定）は制限対象外で全件許可、
 * 過去のイベントは開催日の新しい順に最新count件のみ許可する。
 */
export function allowedEventIds(events, count = EVENT_LIMIT_COUNT) {
  if (!Array.isArray(events)) return new Set();
  const today = getTodayJST();
  const upcoming = events.filter((e) => !e.date || e.date >= today);
  const past = events
    .filter((e) => e.date && e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  return new Set([...upcoming, ...past.slice(0, count)].map((e) => e.id));
}

/**
 * 「過去のイベントは最新2件のみ閲覧可能」制限の状態を返すフック。
 * limited = 制限ON（管理者を含む全ユーザーに適用・ロール読み込み中も制限側に倒す）
 * allowedIds = 閲覧を許可するイベントIDの集合（limited=false の場合は参照しない）
 */
export function useEventViewLimit() {
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["appConfig", EVENT_LIMIT_CONFIG_KEY],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ key: EVENT_LIMIT_CONFIG_KEY });
      return configs[0] || null;
    },
  });

  const limited = config?.value_bool === true;

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date"),
    enabled: limited,
  });

  return {
    limited,
    allowedIds: allowedEventIds(events),
    isLoading: (configLoading && !config) || (limited && eventsLoading),
  };
}