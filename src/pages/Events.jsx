import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, ChevronRight, Trash2, Pencil, TrendingUp, Search } from "lucide-react";
import BackButton from "@/components/BackButton";
import CrewlyLogo from "@/components/CrewlyLogo";
import AdminUserModal from "@/components/AdminUserModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion } from "framer-motion";
import EventFormModal from "@/components/EventFormModal";
import EventPublishToggle from "@/components/EventPublishToggle";
import EventsSidebar from "@/components/EventsSidebar";
import UserRestrictionBanner from "@/components/UserRestrictionBanner";
import GlobalBanner from "@/components/GlobalBanner";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Input } from "@/components/ui/input";

export default function Events() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { canEdit, role, isGuest } = useUserRole();

  const { data: allEvents = [], isLoading, refetch } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-created_date"),
    refetchInterval: LIVE_SYNC_INTERVAL
  });

  // Group events by date and sort by date descending
  const groupedEvents = useMemo(() => {
    if (!allEvents || allEvents.length === 0) return [];
    
    // Filter by search query first
    const filtered = allEvents.filter((event) => {
      const query = searchQuery.toLowerCase();
      const nameMatch = event.name?.toLowerCase().includes(query);
      const venueMatch = event.venue?.toLowerCase().includes(query);
      return nameMatch || venueMatch;
    });
    
    // Sort by date descending (newest first)
    const sorted = [...filtered].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
    
    // Group by date
    const groups = {};
    for (const event of sorted) {
      const dateKey = event.date || "no-date";
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    }
    
    // Convert to array and sort groups by date descending
    return Object.entries(groups)
      .sort((a, b) => {
        if (a[0] === "no-date") return 1;
        if (b[0] === "no-date") return -1;
        return new Date(b[0]) - new Date(a[0]);
      })
      .map(([date, events]) => ({ date, events }));
  }, [allEvents, searchQuery]);

  // Check if a date is today (JST)
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const now = new Date();
    const jstOffset = 9 * 60;
    const jstDate = new Date(now.getTime() + jstOffset * 60000);
    const today = jstDate.toISOString().split("T")[0];
    return dateStr === today;
  };

  const { isPulling, pullDistance } = usePullToRefresh(async () => {
    await refetch();
  });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

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

  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      if (currentUser?.id) {
        await base44.entities.User.delete(currentUser.id);
      }
    } catch {}
    base44.auth.logout();
  };

  const handleDelete = (e, id, name) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteEvent({ id, name });
  };

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom relative scrollbar-hide overflow-x-hidden">
      {/* Pull-to-refresh indicator */}
      {isPulling &&
      <div className="fixed top-0 left-0 right-0 flex justify-center pt-2 z-30">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" style={{ opacity: pullDistance / 100 }} />
        </div>
      }
      <GlobalBanner />
      {/* Sticky Header */}
      <div className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-6xl mx-auto px-2 pb-1.5 pt-1 flex items-center gap-1.5">
          {isGuest && <BackButton to="/home" label="ホームへ戻る" />}
          <CrewlyLogo className="mr-1" administrator={role === "admin"} />
          <h1 className="shrink-0 text-base font-bold tracking-tight text-foreground">イベント一覧</h1>
          <Link
            to="/staff-trends"
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />配置傾向
          </Link>
        </div>
      </div>

      <div className="sm:flex">
        <EventsSidebar
          canEdit={canEdit}
          isAdmin={role === "admin"}
          isGuest={isGuest}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onNewEvent={() => { setEditingEvent(null); setShowModal(true); }}
          onAdminSettings={() => setShowAdminModal(true)}
          onLogout={() => base44.auth.logout()}
          onLogin={() => { localStorage.removeItem("guest_mode"); navigate("/login"); }}
          onDeleteAccount={() => setConfirmDeleteAccount(true)}
        />
        <div className="flex-1 min-w-0">
      <div className="max-w-6xl mx-auto px-1.5 py-1 pb-16 sm:pb-8">
      <UserRestrictionBanner role={role} />

        {isLoading ?
        <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div> :
        groupedEvents.length === 0 ?
        <div className="text-center py-24 text-muted-foreground">
            <Calendar className="w-14 h-14 mx-auto mb-4 opacity-20" />
            {searchQuery ? (
              <>
                <p className="text-lg font-medium">該当するイベントがありません</p>
                <p className="text-sm mt-1">検索条件を変更してください</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">イベントがありません</p>
                <p className="text-sm mt-1">新規イベントを追加してください</p>
              </>
            )}
          </div> :

        <div className="space-y-4 pb-6">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="イベント名または会場名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Grouped events */}
          {groupedEvents.map(({ date, events: dateEvents }, groupIdx) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIdx * 0.05 }}
              className="space-y-2"
            >
              {/* Date header */}
              {date !== "no-date" && (
                <div className="font-bold text-base text-foreground border-b border-border pb-1 mb-2">
                  {format(new Date(date), "M 月 d 日（E）", { locale: ja })}
                  {isToday(date) && <span className="ml-2 text-xs text-primary">（今日）</span>}
                </div>
              )}
              {date === "no-date" && (
                <div className="font-bold text-base text-foreground border-b border-border pb-1 mb-2">
                  日付未設定
                </div>
              )}

              {/* Event rows */}
              {dateEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className={`group block bg-card border rounded-lg px-2.5 py-1.5 hover:shadow-sm transition-all duration-200 ${
                    isToday(date)
                      ? "border-primary hover:border-primary/60"
                      : "border-border hover:border-primary/40"
                  }`}>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <h2 className="text-sm font-semibold text-foreground truncate">{event.name}</h2>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {event.date && (
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" />
                            {format(new Date(event.date), "M 月 d 日（E）", { locale: ja })}
                          </span>
                        )}
                        {event.venue && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {event.venue}
                          </span>
                        )}
                        <EventPublishToggle event={event} canEdit={canEdit} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-0.5">
                      {!isGuest && (
                        <>
                          <button
                            onClick={(e) => handleEdit(e, event)}
                            disabled={!canEdit}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:pointer-events-none select-none" aria-label={`${event.name} を編集`}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, event.id, event.name)}
                            disabled={!canEdit}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none select-none" aria-label={`${event.name} を削除`}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </motion.div>
          ))}
        </div>
        }
      </div>{/* end max-w container */}
        </div>{/* end flex-1 */}
      </div>{/* end sm:flex */}

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

      {confirmDeleteAccount &&
      <ConfirmDialog
        message={"アカウントを削除しますか？\nこの操作は取り消せません。"}
        confirmLabel="削除する"
        confirmVariant="destructive"
        onConfirm={() => {setConfirmDeleteAccount(false);handleDeleteAccount();}}
        onCancel={() => setConfirmDeleteAccount(false)} />

      }

      {showAdminModal && <AdminUserModal onClose={() => setShowAdminModal(false)} />}

      {showModal &&
      <EventFormModal
        event={editingEvent}
        onClose={() => setShowModal(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["events"] });
        }} />

      }
    </div>);

}