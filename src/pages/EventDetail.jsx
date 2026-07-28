import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { User, LogOut, Users, ClipboardList, Bell, Settings, LogIn, ShieldCheck, FileText, Monitor, LayoutTemplate, RefreshCw, CalendarX2, Tag, QrCode, Phone, KeyRound, Paperclip } from "lucide-react";
import BackButton from "@/components/BackButton";
import { motion, AnimatePresence } from "framer-motion";
import StaffManagement from "@/components/StaffManagement";
import PositionTypeManagement from "@/components/PositionTypeManagement";
import AdminSettings from "@/components/AdminSettings";
import StaffDragDropManager from "@/components/StaffDragDropManager";
import PositionNotesEditor from "@/components/PositionNotesEditor";
import BottomTabBar from "@/components/BottomTabBar";
import SidebarNav from "@/components/SidebarNav";
import UserNameEditor, { getUserDisplayName } from "@/components/UserNameEditor";
import UserRestrictionBanner from "@/components/UserRestrictionBanner";
import GlobalBanner from "@/components/GlobalBanner";
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
import SeatingMapViewer from "@/components/SeatingMapViewer";
import VenueManager from "@/components/VenueManager";
import TagManagement from "@/components/TagManagement";
import EmergencyContactManager from "@/components/EmergencyContactManager";
import PinCodeManager from "@/components/PinCodeManager";
import SharedFileManager from "@/components/SharedFileManager";

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
  const [adminSection, setAdminSection] = useState("users"); // 'users' | 'operation_logs' | 'view_logs' | 'portal_restriction'
  const [settingsSection, setSettingsSection] = useState("positions");
  const topBarRef = useRef(null);
  const [topBarHeight, setTopBarHeight] = useState(56);
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

  // Reset section when switching between admin/settings tabs
  useEffect(() => {
    if (tab === "admin") setAdminSection("users");
    if (tab === "settings") setSettingsSection("positions");
  }, [tab]);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch tab-disabled configs for filtering
  const { data: tabConfigs = [] } = useQuery({
    queryKey: ["appConfig", "tab_control"],
    queryFn: () => base44.entities.AppConfig.list(),
    refetchInterval: 30000,
    enabled: !isAdmin,
  });
  const disabledTabIds = isAdmin
    ? []
    : tabConfigs
        .filter((c) => c.key?.startsWith("tab_disabled_") && c.value_bool)
        .map((c) => c.key.replace("tab_disabled_", ""));

  const { data: event, isLoading, refetch: refetchEvent } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => loadEventById(eventId),
    refetchInterval: EVENT_MODE_REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });

  const { isPulling, pullDistance } = usePullToRefresh(async () => {
    await refetchEvent();
  });

  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const update = () => setTopBarHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm font-medium">イベント情報を読み込んでいます</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <CalendarX2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h1 className="text-base font-bold">イベントが見つかりません</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            イベントが削除されたか、表示する権限がない可能性があります。
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              再読み込み
            </Button>
            <Button onClick={() => { window.location.href = "/events"; }}>イベント一覧</Button>
          </div>
        </div>
      </div>
    );
  }

  const desktopTabs = [
    { id: "staff", label: "スタッフ管理", icon: Users },
    { id: "dragdrop", label: "配置表", icon: ClipboardList },
    { id: "seating_map", label: "客席配置図", icon: LayoutTemplate },
    ...(isPrivileged ? [{ id: "files", label: "ファイル共有", icon: Paperclip }] : []),
    ...(isAdmin ? [{ id: "admin", label: "管理者設定", icon: ShieldCheck }] : []),
    ...(isPrivileged ? [{ id: "settings", label: "管理設定", icon: Settings }] : []),
  ].filter((t) => isAdmin || !disabledTabIds.includes(t.id));

  const managementTabs = desktopTabs
    .filter(({ id }) => id === "settings" || id === "admin")
    .map((item) => ({
      ...item,
      label: item.id === "admin" ? "管理者設定" : "管理設定",
    }));
  const isManagementTab = managementTabs.some(({ id }) => id === tab);
  const activeManagementChildren = tab === "admin"
    ? [
        { id: "users", label: "ユーザー管理", icon: Users },
        { id: "operation_logs", label: "操作ログ", icon: FileText },
        { id: "portal_restriction", label: "ポータル制限", icon: ShieldCheck },
        { id: "global_banner", label: "グローバル通知", icon: Bell },
        { id: "tab_control", label: "タブ制御", icon: LayoutTemplate },
        { id: "staff_qr", label: "スタッフ QR 出力", icon: QrCode },
      ]
    : tab === "settings"
      ? [
          { id: "positions", label: "ポジション設定", icon: Settings },
          { id: "presets", label: "ポジションプリセット", icon: ClipboardList },
          { id: "venues", label: "会場管理", icon: LayoutTemplate },
          ...(isPrivileged ? [{ id: "pos_notes", label: "ポジション説明", icon: FileText }] : []),
          { id: "tag_management", label: "タグ・役割管理", icon: Tag },
          { id: "emergency_contacts", label: "緊急連絡先", icon: Phone },
          { id: "pin_management", label: "PIN管理", icon: KeyRound },
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
    <div className="min-h-screen bg-background relative scrollbar-hide overflow-x-clip">
      {isPulling && (
        <div className="fixed top-0 left-0 right-0 flex justify-center pt-2 z-30">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" style={{ opacity: pullDistance / 100 }} />
        </div>
      )}

      <GlobalBanner />

      {/* Top bar */}
      <div ref={topBarRef} className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-[1400px] mx-auto px-1.5 pb-1 pt-1 flex flex-wrap items-center gap-1 sm:flex-nowrap sm:gap-1.5">
          <BackButton to="/events" label="イベント一覧へ戻る" />
          <div className="hidden sm:flex flex-col items-start mr-1">
            <CrewlyLogo administrator={role === "admin"} />
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5 pl-0.5">{currentTime}</span>
          </div>
          <div className="order-2 min-w-0 basis-full flex-1 pl-10 sm:order-none sm:basis-auto sm:pl-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <h1 className="font-bold text-sm leading-snug truncate min-w-0">{event.name}</h1>
              {(event.time_priority || event.time_open || event.time_start || event.time_end) && (
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 shrink-0">
                  {event.time_priority && <EventTimeDisplay eventDate={event.date} eventTime={event.time_priority} endTime={event.time_priority_end} label="先行" />}
                  {event.time_open && <EventTimeDisplay eventDate={event.date} eventTime={event.time_open} endTime={event.time_start} label="開場" />}
                  {event.time_start && <EventTimeDisplay eventDate={event.date} eventTime={event.time_start} endTime={event.time_end} label="開演" />}
                  {event.time_end && <EventTimeDisplay eventDate={event.date} eventTime={event.time_end} label="終演" />}
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
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:ml-0 sm:h-7 sm:w-7"
            title="スクリーンセーバー"
            aria-label="スクリーンセーバーを表示"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <ThemeToggle />
          {currentUser ? (
            <div className="flex h-9 max-w-36 shrink-0 items-center gap-0.5 rounded-md bg-muted px-0.5 sm:h-7 sm:gap-1 sm:px-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 sm:h-5 sm:w-5">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="hidden max-w-20 truncate text-[11px] font-medium sm:block">{getUserDisplayName(currentUser)}</span>
              <UserNameEditor user={currentUser} onSaved={setCurrentUser} />
              <button
                onClick={() => base44.auth.logout()}
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive sm:h-5 sm:w-5"
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

      </div>

      {/* 2-column layout: sidebar + content (PC only) */}
      <div className="sm:flex">
        <SidebarNav tabs={desktopTabs} activeTab={tab} onSelectTab={selectTab} topOffset={topBarHeight} />
        <div className="flex-1 min-w-0">
          {/* Child tab bar */}
          {isManagementTab && (
            <div className="block border-b border-border/70 bg-muted/40 sm:sticky sm:z-40" style={{ top: topBarHeight }}>
              <div className="max-w-[1400px] mx-auto px-2">
                <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-4 sm:overflow-x-auto sm:scrollbar-hide">
                  {activeManagementChildren.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => selectManagementChild(id)}
                      className={`flex min-h-9 min-w-0 select-none items-center justify-center gap-1 whitespace-normal border-b-2 px-1 py-1 text-center text-[10px] font-semibold leading-tight transition-colors focus-visible:outline-none sm:min-h-0 sm:shrink-0 sm:justify-start sm:gap-1.5 sm:whitespace-nowrap sm:px-0 sm:py-2 sm:text-left sm:text-xs ${
                        activeManagementChild === id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      aria-current={activeManagementChild === id ? "page" : undefined}
                    >
                      <Icon className="hidden h-3.5 w-3.5 sm:block" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="max-w-[1400px] mx-auto px-1 py-1 pb-16 sm:pb-8">
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
            {tab === "settings" && settingsSection === "positions" && <PositionTypeManagement eventId={eventId} section="positions" />}
            {tab === "settings" && settingsSection === "presets" && <PositionTypeManagement eventId={eventId} section="presets" />}
            {tab === "settings" && settingsSection === "venues" && <VenueManager />}
            {tab === "settings" && settingsSection === "pos_notes" && <PositionNotesEditor eventId={eventId} />}
            {tab === "settings" && settingsSection === "tag_management" && <TagManagement />}
            {tab === "settings" && settingsSection === "emergency_contacts" && <EmergencyContactManager eventId={eventId} />}
            {tab === "settings" && settingsSection === "pin_management" && <PinCodeManager />}
            {tab === "seating_map" && <SeatingMapViewer eventId={eventId} />}
            {tab === "files" && <SharedFileManager eventId={eventId} showAll={true} />}
          </motion.div>
        </AnimatePresence>
      </div>
        </div>
      </div>

      {showScreenSaver && (
        <EventScreenSaver event={event} onExit={() => setShowScreenSaver(false)} administrator={role === "admin"} />
      )}

      {confirmScreenSaver && (
        <ConfirmDialog
          message={"スクリーンセーバーを有効にしますか？\nスクリーンセーバーを終了するには、ロゴを5回クリックまたはタップしてください。"}
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