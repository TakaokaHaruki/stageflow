import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/hooks/useUserRole";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Calendar, Search, Plus, X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ConfirmDialog";
import EventFormModal from "@/components/EventFormModal";
import EventListItem from "@/components/EventListItem";
import UserRestrictionBanner from "@/components/UserRestrictionBanner";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { formatJaDate } from "@/lib/dateFormat";

function getTodayJST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60000).toISOString().split("T")[0];
}

export default function Events() {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const queryClient = useQueryClient();
  const { canEdit, role, isGuest, isAdmin } = useUserRole();

  const { data: allEvents = [], isLoading, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date"),
    refetchInterval: LIVE_SYNC_INTERVAL
  });

  const todayStr = getTodayJST();

  // 今日を境に「今後」「過去」へ分離し、日付ごとにグループ化する
  const { upcomingGroups, pastGroups, pastCount } = useMemo(() => {
    if (!allEvents || allEvents.length === 0) return { upcomingGroups: [], pastGroups: [], pastCount: 0 };

    const query = searchQuery.toLowerCase();
    const filtered = allEvents.filter((event) => {
      const nameMatch = event.name?.toLowerCase().includes(query);
      const venueMatch = event.venue?.toLowerCase().includes(query);
      return nameMatch || venueMatch;
    });

    const groupByDate = (list) => {
      const groups = {};
      for (const event of list) {
        const dateKey = event.date || "no-date";
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(event);
      }
      return Object.entries(groups).map(([date, events]) => ({ date, events }));
    };

    const withDate = filtered.filter((e) => e.date);
    const noDate = filtered.filter((e) => !e.date);
    const upcoming = withDate.filter((e) => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    const past = withDate.filter((e) => e.date < todayStr).sort((a, b) => b.date.localeCompare(a.date));

    return {
      upcomingGroups: [...groupByDate(upcoming), ...groupByDate(noDate)],
      pastGroups: groupByDate(past),
      pastCount: past.length,
    };
  }, [allEvents, searchQuery, todayStr]);

  const isToday = (dateStr) => dateStr === todayStr;

  const { isPulling, pullDistance } = usePullToRefresh(async () => {
    await refetch();
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previousEvents = queryClient.getQueryData(["events"]);
      queryClient.setQueryData(["events"], (old = []) => old.filter((event) => event.id !== id));
      return { previousEvents };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["events"], context?.previousEvents);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] })
  });

  const handleEdit = (e, event) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingEvent(event);
    setShowModal(true);
  };

  const handleDelete = (e, id, name) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteEvent({ id, name });
  };

  const renderGroup = ({ date, events: dateEvents }, groupIdx) => (
    <motion.div
      key={date}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: groupIdx * 0.05 }}
      className="space-y-2"
    >
      {date !== "no-date" && (
        <div className="mb-2 mr-2 border-b border-border pb-1 text-base font-bold text-foreground">
          {formatJaDate(date)}
          {isToday(date) && <span className="ml-2 text-xs text-primary">（今日）</span>}
        </div>
      )}
      {date === "no-date" && (
        <div className="mb-2 border-b border-border pb-1 text-base font-bold text-foreground">
          日付未設定
        </div>
      )}
      {dateEvents.map((event) => (
        <EventListItem
          key={event.id}
          event={event}
          isToday={isToday(date)}
          isAdmin={isAdmin}
          canEdit={canEdit}
          isGuest={isGuest}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </motion.div>
  );

  return (
    <>
      <div className="mx-auto max-w-6xl px-1.5 py-1">
        {/* Pull-to-refresh indicator */}
        {isPulling &&
          <div className="fixed top-0 left-0 right-0 z-30 flex justify-center pt-2">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary/30 border-t-primary" style={{ opacity: pullDistance / 100 }} />
          </div>
        }
        <UserRestrictionBanner role={role} />

        {/* 検索と新規イベント作成 */}
        <div className="flex items-center gap-2 py-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="イベント名または会場名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="検索条件をクリア"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {canEdit && (
            <Button
              size="sm"
              className="h-8 shrink-0 gap-1 px-3 text-xs"
              onClick={() => { setEditingEvent(null); setShowModal(true); }}
            >
              <Plus className="h-3 w-3" />新規イベント
            </Button>
          )}
        </div>

        {isLoading ?
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          </div> :
          upcomingGroups.length === 0 && pastCount === 0 ?
          <div className="py-24 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-4 h-14 w-14 opacity-20" />
            {searchQuery ?
              <>
                <p className="text-lg font-medium">該当するイベントがありません</p>
                <p className="mt-1 text-sm">検索条件を変更してください</p>
              </> :

              <>
                <p className="text-lg font-medium">イベントがありません</p>
                <p className="mt-1 text-sm">新規イベントを追加してください</p>
              </>
            }
          </div> :

          <div className="space-y-4 pb-6">
            {/* 今後のイベント */}
            {upcomingGroups.length > 0 && (
              <div>
                <div className="mb-1 px-1 text-xs font-bold text-muted-foreground">今後のイベント</div>
                <div className="space-y-4">
                  {upcomingGroups.map(renderGroup)}
                </div>
              </div>
            )}

            {/* 過去のイベント（折りたたみ・検索中は展開） */}
            {pastCount > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowPast((v) => !v)}
                  aria-expanded={showPast || Boolean(searchQuery)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${(showPast || searchQuery) ? "" : "-rotate-90"}`} />
                  過去のイベント（{pastCount}件）
                </button>
                {(showPast || searchQuery) && (
                  <div className="space-y-4">
                    {pastGroups.map(renderGroup)}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      </div>

      {confirmDeleteEvent &&
        <ConfirmDialog
          message={`「${confirmDeleteEvent.name}」を削除しますか？`}
          confirmLabel="削除"
          confirmVariant="destructive"
          onConfirm={() => {
            deleteMutation.mutate(confirmDeleteEvent.id);
            setConfirmDeleteEvent(null);
          }}
          onCancel={() => setConfirmDeleteEvent(null)} />
      }

      {showModal &&
        <EventFormModal
          event={editingEvent}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["events"] });
          }} />
      }
    </>
  );
}