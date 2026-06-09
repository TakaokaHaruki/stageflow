import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { User, LogOut, Users, ClipboardList, Bell, Settings, LogIn, ShieldCheck, Paperclip, FileText } from "lucide-react";
import BackButton from "@/components/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import StaffManagement from "@/components/StaffManagement";
import PositionTypeManagement from "@/components/PositionTypeManagement";
import AdminSettings from "@/components/AdminSettings";
import AnnouncementManager from "@/components/AnnouncementManager";
import AnnouncementAlert from "@/components/AnnouncementAlert";
import StaffDragDropManager from "@/components/StaffDragDropManager";
import SharedFileManager from "@/components/SharedFileManager";
import PositionNotesEditor from "@/components/PositionNotesEditor";
import BottomTabBar from "@/components/BottomTabBar";
import UserNameEditor, { getUserDisplayName } from "@/components/UserNameEditor";
import UserRestrictionBanner from "@/components/UserRestrictionBanner";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import { EVENT_MODE_REFETCH_INTERVAL, loadEventById } from "@/lib/eventLoader";
import CrewlyLogo from "@/components/CrewlyLogo";

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function EventDetail() {
  const { eventId } = useParams();
  const [tab, setTab] = useTabNavigation("staff");
  const [tabResetKey, setTabResetKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { isAdmin, isChief, canEdit, canManageSettings, role } = useUserRole();
  const isPrivileged = isAdmin || isChief;
  const [currentUser, setCurrentUser] = useState(null);

  const handleTabChange = (newTab, options) => {
    setTab(newTab, options);
  };

  const handleActiveTabReset = () => {
    setTabResetKey((key) => key + 1);
  };

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: event, isLoading, refetch: refetchEvent } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => loadEventById(eventId),
    refetchInterval: EVENT_MODE_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });

  const { isPulling, pullDistance } = usePullToRefresh(async () => {
    await refetchEvent();
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) return <div className="p-8 text-muted-foreground">イベントが見つかりません</div>;

  const desktopTabs = [
    { id: "staff", label: "スタッフ管理", icon: Users },
    { id: "dragdrop", label: "配置表", icon: ClipboardList },
    { id: "notice", label: "連絡事項", icon: Bell },
    { id: "files", label: "ファイル共有", icon: Paperclip },
    ...(isPrivileged ? [{ id: "pos_notes", label: "ポジション説明", icon: FileText }] : []),
    ...(isAdmin ? [{ id: "admin", label: "管理者設定", icon: ShieldCheck }] : []),
    ...(isPrivileged ? [{ id: "settings", label: "管理設定", icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-background relative scrollbar-hide">
      {isPulling && (
        <div className="fixed top-0 left-0 right-0 flex justify-center pt-2 z-30">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" style={{ opacity: pullDistance / 100 }} />
        </div>
      )}

      <AnnouncementAlert eventId={eventId} />

      {/* Top bar */}
      <div className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-6xl mx-auto px-2 pb-1.5 pt-1 flex items-center gap-1.5">
          <BackButton to="/events" label="イベント一覧へ戻る" />
          <div className="hidden sm:flex flex-col items-start mr-1">
            <CrewlyLogo />
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5 pl-0.5">{currentTime}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="font-bold text-sm leading-snug truncate shrink-0">{event.name}</h1>
              {(event.time_priority || event.time_open || event.time_start || event.time_end) && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 shrink-0">
                  {event.time_priority && <span>先行 {event.time_priority}</span>}
                  {event.time_open && <span>開場 {event.time_open}</span>}
                  {event.time_start && <span>開演 {event.time_start}</span>}
                  {event.time_end && <span>終演 {event.time_end}</span>}
                </div>
              )}
            </div>
            {(event.date || event.venue) && (
              <div className="text-xs text-muted-foreground leading-snug mt-0.5">
                {event.date && format(new Date(event.date), "M月d日（E）", { locale: ja })}
                {event.venue && `　${event.venue}`}
                <span className="sm:hidden ml-2">{currentTime}</span>
              </div>
            )}
          </div>
          {currentUser ? (
            <div className="flex items-center gap-1.5 bg-muted rounded-md px-1.5 py-0.5 shrink-0">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium leading-none">{getUserDisplayName(currentUser)}</div>
                {getUserDisplayName(currentUser) !== currentUser.email && <div className="text-[11px] text-muted-foreground leading-none mt-0.5">{currentUser.email}</div>}
              </div>
              <UserNameEditor user={currentUser} onSaved={setCurrentUser} />
              <button
                onClick={() => base44.auth.logout()}
                className="ml-1 flex items-center justify-center w-9 h-9 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="ログアウト"
                aria-label="ログアウト"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs px-2 shrink-0" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
              <LogIn className="w-3 h-3" />ログイン
            </Button>
          )}
        </div>

        {/* Desktop tab bar */}
        <div className="hidden sm:block border-t border-border bg-card/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-3">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {desktopTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (tab === id) handleActiveTabReset();
                    handleTabChange(id, tab === id ? { replace: true, reset: true } : undefined);
                  }}
                  className={`flex items-center gap-1.5 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus-visible:outline-none select-none shrink-0 ${
                    tab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={tab === id ? "page" : undefined}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-1.5 py-1.5 pb-16 sm:pb-8">
        <UserRestrictionBanner role={role} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${tab}-${tabResetKey}`}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {tab === "staff" && <StaffManagement eventId={eventId} />}
            {tab === "dragdrop" && <StaffDragDropManager eventId={eventId} />}
            {tab === "admin" && (
              <AdminSettings
                eventId={eventId}
                event={event}
              />
            )}
            {tab === "settings" && <PositionTypeManagement eventId={eventId} />}
            {tab === "notice" && <AnnouncementManager eventId={eventId} />}
            {tab === "files" && <SharedFileManager eventId={eventId} />}
            {tab === "pos_notes" && <PositionNotesEditor eventId={eventId} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Tab Navigation - Mobile Only */}
      <div className="sm:hidden">
        <BottomTabBar
          activeTab={tab}
          onTabChange={handleTabChange}
          onActiveTabReset={handleActiveTabReset}
          isPrivileged={isPrivileged}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}