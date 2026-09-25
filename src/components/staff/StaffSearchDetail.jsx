import { ArrowLeft, MapPin, Clock, Crown, Tag, CalendarDays } from "lucide-react";

const TIME_SLOTS = ["開場中", "開演中", "終演後", "通し"];

function BarRow({ label, count, max, color = "bg-primary" }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-20 shrink-0 truncate text-muted-foreground">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-6 text-right font-semibold tabular-nums">{count}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <div className="text-lg font-bold text-primary tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function StaffSearchDetail({ staff, onBack }) {
  const maxTime = Math.max(1, ...TIME_SLOTS.map(t => staff.timeSlotCounts?.[t] || 0));
  const maxVenue = Math.max(1, ...staff.venueCounts.map(v => v.count));
  const maxPos = Math.max(1, ...staff.positionCounts.map(p => p.count));

  return (
    <div className="space-y-4 p-4 pb-10">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />検索結果へ戻る
      </button>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h1 className="text-xl font-bold">{staff.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {staff.gender && <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted">{staff.gender}</span>}
          {staff.roles.map(r => (
            <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r}</span>
          ))}
          {staff.skills.map(sk => (
            <span key={sk} className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{sk}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="参加イベント" value={staff.eventCount} />
          <Stat label="ポジション数" value={staff.positionCount} />
          <Stat label="チーフ経験" value={staff.chiefCount} />
        </div>
      </div>

      <Section icon={Clock} title="時間帯の傾向">
        <div className="space-y-2">
          {TIME_SLOTS.map(t => (
            <BarRow key={t} label={t} count={staff.timeSlotCounts?.[t] || 0} max={maxTime} />
          ))}
        </div>
      </Section>

      {staff.venueCounts.length > 0 && (
        <Section icon={MapPin} title="会場の傾向">
          <div className="space-y-2">
            {staff.venueCounts.slice(0, 5).map(v => (
              <BarRow key={v.venue} label={v.venue} count={v.count} max={maxVenue} color="bg-emerald-500" />
            ))}
          </div>
        </Section>
      )}

      {staff.positionCounts.length > 0 && (
        <Section icon={Tag} title="ポジションの傾向">
          <div className="space-y-2">
            {staff.positionCounts.slice(0, 8).map(p => (
              <BarRow key={p.name} label={p.name} count={p.count} max={maxPos} color="bg-indigo-500" />
            ))}
          </div>
        </Section>
      )}

      <Section icon={CalendarDays} title={`参加イベント (${staff.events.length})`}>
        <div className="space-y-2">
          {staff.events.map(ev => (
            <div key={ev.event_id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm truncate">{ev.event_name}</div>
                <span className="text-[10px] text-muted-foreground shrink-0">{ev.date || "日付未定"}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{ev.venue || "会場未定"}</span>
                {ev.status && <span className="px-1.5 py-0.5 rounded bg-muted shrink-0">{ev.status}</span>}
              </div>
              {ev.positions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {ev.positions.map((p, i) => (
                    <span
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${p.is_chief ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-muted"}`}
                    >
                      {p.is_chief && <Crown className="w-2.5 h-2.5 inline mr-0.5" />}
                      {p.name}
                      {p.side && `(${p.side})`}
                      <span className="text-muted-foreground ml-1">{p.time_slot}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-[11px] text-muted-foreground">配置なし</div>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}