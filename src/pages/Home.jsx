import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarDays, Users, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppNav from "@/components/AppNav";
import StatCard from "@/components/home/StatCard";
import SlotRow from "@/components/home/SlotRow";
import { TIME_SLOTS } from "@/lib/constants";
import { getNavItems } from "@/lib/navConfig";
import { useUserRole } from "@/hooks/useUserRole";

function getTodayJST() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60000).toISOString().split("T")[0];
}

export default function Home() {
  const navigate = useNavigate();
  const { isAdmin, canEdit, isGuest } = useUserRole();
  const today = getTodayJST();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  const todayEvents = events.filter((e) => e.date === today);
  const nextEvent = useMemo(
    () => [...events].filter((e) => e.date && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0] || null,
    [events, today]
  );

  const { data: positionsRes } = useQuery({
    queryKey: ["home-positions", nextEvent?.id],
    queryFn: () => base44.functions.invoke("getPositionList", { eventId: nextEvent.id }),
    enabled: !!nextEvent,
  });
  const positions = positionsRes?.data?.positions ?? [];

  const { data: staffRes } = useQuery({
    queryKey: ["home-staff", nextEvent?.id],
    queryFn: () => base44.functions.invoke("getStaffList", { eventId: nextEvent.id }),
    enabled: !!nextEvent,
  });
  const staff = staffRes?.data?.staff ?? [];

  const { data: announcements = [] } = useQuery({
    queryKey: ["home-announcements", nextEvent?.id],
    queryFn: () => base44.entities.Announcement.filter({ event_id: nextEvent.id }),
    enabled: !!nextEvent,
  });

  const assignedNames = new Set(positions.flatMap((p) => [
    ...(p.staff_names || []),
    ...(p.staff_names_kamite || []),
    ...(p.staff_names_shimote || []),
  ]));
  const unassignedCount = nextEvent ? Math.max(0, staff.length - assignedNames.size) : 0;
  const alertCount = nextEvent ? announcements.filter((a) => a.is_alert).length : 0;

  const slotStats = TIME_SLOTS.map((slot) => {
    const slotPositions = positions.filter((p) => (p.time_slot || "開場中") === slot);
    const assigned = new Set(slotPositions.flatMap((p) => [
      ...(p.staff_names || []),
      ...(p.staff_names_kamite || []),
      ...(p.staff_names_shimote || []),
    ])).size;
    const required = slotPositions.reduce((sum, p) => sum + (p.required_count ?? 0), 0);
    return { slot, assigned, required };
  });

  const quickLinks = getNavItems({ isAdmin, canEdit, isGuest }).filter((i) => i.id !== "home");

  return (
    <AppNav activeTab="home" title="ホーム">
      <div className="mx-auto max-w-5xl space-y-3 px-2 py-3">
        {/* KPI帯（最重要指標を最上位に配置） */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard icon={CalendarDays} label="本日のイベント" value={todayEvents.length} sub={todayEvents[0]?.name} />
            <StatCard icon={CalendarDays} label="次回イベント" value={nextEvent ? format(new Date(nextEvent.date), "M/d") : "—"} sub={nextEvent?.name || "予定なし"} />
            <StatCard
              icon={Users}
              label="未配置スタッフ（次回）"
              value={nextEvent ? unassignedCount : "—"}
              sub={nextEvent ? `スタッフ総数 ${staff.length}名` : "次回イベントなし"}
              tone={nextEvent ? (unassignedCount > 0 ? "danger" : "ok") : "default"}
            />
            <StatCard
              icon={AlertTriangle}
              label="緊急お知らせ（次回）"
              value={nextEvent ? alertCount : "—"}
              sub={nextEvent ? (alertCount > 0 ? "確認が必要です" : "アラートなし") : "次回イベントなし"}
              tone={alertCount > 0 ? "danger" : "default"}
            />
          </div>
        )}

        {/* 次回イベントの時間帯別充足状況 */}
        {nextEvent && (
          <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-bold">時間帯別の配置状況</h2>
                <p className="truncate text-[11px] text-muted-foreground">
                  {nextEvent.name} ・ {format(new Date(nextEvent.date), "M月d日（E）", { locale: ja })}
                  {nextEvent.venue ? ` ・ ${nextEvent.venue}` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => navigate(`/events/${nextEvent.id}`)}>
                開く
              </Button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {slotStats.map((s) => (
                <SlotRow key={s.slot} slot={s.slot} assigned={s.assigned} required={s.required} />
              ))}
            </div>
          </div>
        )}

        {/* クイックリンク */}
        <div className="rounded-2xl border border-border bg-card p-3 shadow-md">
          <h2 className="mb-2 text-sm font-bold">クイックリンク</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map(({ id, label, description, icon: Icon, path }) => (
              <button
                key={id}
                type="button"
                onClick={() => navigate(path)}
                className="group flex items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppNav>
  );
}