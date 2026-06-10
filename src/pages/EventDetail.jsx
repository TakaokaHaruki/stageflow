import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { User, LogOut, Users, ClipboardList, Bell, Settings, LogIn, ShieldCheck, Paperclip, FileText, Monitor } from "lucide-react";
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
import EventTimeDisplay from "@/components/EventTimeDisplay";
import EventScreenSaver from "@/components/EventScreenSaver";
import ThemeToggle from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";

const tabVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function EventDetail() {
  const { eventId } = useParams();
  const [tab, setTab] = useTabNavigation("staff");
  const [tabResetKey, setTabResetKey] = useState(0);
  const [showScreenSaver, setShowScreenSaver] = useState(false);
  const [confirmScreenSaver, setConfirmScreenSaver] = useState(false);
  const [adminSection, setAdminSection] = useState("users");
  const [settingsSection, setSettingsSection] = useState("positions");
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

  const managementTabs = desktopTabs
    .filter(({ id }) => id === "settings" || id === "admin")
    .map((item) => ({
      ...item,
      label: item.id === "admin" ? "管理者設定" : "管理設定",
    }));
  const primaryTabs = desktopTabs.filter(({ id }) => id !== "settings" && id !== "admin");
  const isManagementTab = managementTabs.some(({ id }) => id === tab);
  const activeManagementChildren = tab === "admin"
    ? [
        { id: "users", label: "ユーザー管理", icon: Users },
        { id: "logs", label: "操作ログ", icon: FileText },
      ]
    : tab === "settings"
      ? [
          { id: "positions", label: "ポジション設定", icon: Settings },
          { id: "presets", label: "ポジションプリセット", icon: ClipboardList },
        ]
      : [];
  const activeManagementChild = tab === "admin" ? adminSection : settingsSection;

  const selectManagementChild = (childId) => {
    if (tab === "admin") setAdminSection(childId);
    if (tab === "settings") setSettingsSection(childId);
  };

  const selectTab = (childId) => {
    if (tab === childId) handleActiveTabReset();
    handleTabChange(childId, tab === childId ? { replace: true, reset: true } : undefined);
  };

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
                  {event.time_priority && <EventTimeDisplay eventDate={event.date} eventTime={event.time_priority} endTime={event.time_priority_end} label="先行" />}
                  {event.time_open && <EventTimeDisplay eventDate={event.date} eventTime={event.time_open} endTime={event.time_open_end} label="開場" />}
                  {event.time_start && <EventTimeDisplay eventDate={event.date} eventTime={event.time_start} endTime={event.time_start_end} label="開演" />}
                  {event.time_end && <EventTimeDisplay eventDate={event.date} eventTime={event.time_end} endTime={event.time_end_end} label="終演" />}
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
          <button
            type="button"
            onClick={() => setConfirmScreenSaver(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="スクリーンセーバー"
            aria-label="スクリーンセーバーを表示"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <ThemeToggle />
          {currentUser ? (
            <div className="flex h-7 max-w-36 shrink-0 items-center gap-1 rounded-md bg-muted px-1">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="hidden max-w-20 truncate text-[11px] font-medium sm:block">{getUserDisplayName(currentUser)}</span>
              <UserNameEditor user={currentUser} onSaved={setCurrentUser} />
              <button
                onClick={() => base44.auth.logout()}
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
                title="ログアウト"
                aria-label="ログアウト"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs px-2 shrink-0" onClick={() => base44.auth.redirectToLogin(window.location.href)}>
              <LogIn className="w-3 h-3" />ログイン
            </Button>
          )}
        </div>

        {/* Parent tab bar */}
        <div className="hidden sm:block border-t border-border bg-card/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-3">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {primaryTabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => selectTab(id)}
                    className={`flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap border-b-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none ${
                      tab === id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    aria-current={tab === id ? "page" : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
              ))}
              {managementTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => selectTab(id)}
                  className={`flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap border-b-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none ${
                    tab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={tab === id ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Child tab bar */}
        {isManagementTab && (
        <div className="block border-t border-border/70 bg-muted/40">
          <div className="max-w-6xl mx-auto px-3">
            <div className="flex gap-4 overflow-x-auto scrollbar-hide">
              {activeManagementChildren.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => selectManagementChild(id)}
                  className={`flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap border-b-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none ${
                    activeManagementChild === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  aria-current={activeManagementChild === id ? "page" : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-1.5 py-1.5 pb-16 sm:pb-8">
        <UserRestrictionBanner role={role} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${tab}-${activeManagementChild || "main"}-${tabResetKey}`}
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
                section={adminSection}
              />
            )}
            {tab === "settings" && <PositionTypeManagement eventId={eventId} section={settingsSection} />}
            {tab === "notice" && <AnnouncementManager eventId={eventId} />}
            {tab === "files" && <SharedFileManager eventId={eventId} />}
            {tab === "pos_notes" && <PositionNotesEditor eventId={eventId} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {showScreenSaver && (
        <EventScreenSaver event={event} onExit={() => setShowScreenSaver(false)} />
      )}

      {confirmScreenSaver && (
        <ConfirmDialog
          message="スクリーンセーバーを有効にしますか？"
          confirmLabel="有効にする"
          confirmVariant="default"
          onCancel={() => setConfirmScreenSaver(false)}
          onConfirm={() => {
            setConfirmScreenSaver(false);
            setShowScreenSaver(true);
          }}
        />
      )}

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
