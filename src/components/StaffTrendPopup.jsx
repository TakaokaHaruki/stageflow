import { useEffect } from "react";
import { History, X } from "lucide-react";
import ModalShell from "@/components/ModalShell";
import { TIME_SLOTS, TIME_SLOT_STYLES } from "@/lib/constants";

const SLOT_ORDER = ["開場中", "開演中", "終演後"];

export default function StaffTrendPopup({ staffName, tally, recentEventCount = 0, onClose }) {
  useEffect(() => {
    if (!staffName) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [staffName, onClose]);

  if (!staffName) return null;
  const staffTally = tally?.[staffName] || {};

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-full bg-primary/10 shrink-0">
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{staffName}</h3>
            <p className="text-[11px] text-muted-foreground">過去の配置傾向{recentEventCount > 0 ? `（直近${recentEventCount}イベント）` : ""}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0" aria-label="閉じる">
          <X className="w-4 h-4" />
        </button>
      </div>

      {SLOT_ORDER.every((slot) => Object.keys(staffTally[slot] || {}).length === 0) ? (
        <p className="text-xs text-muted-foreground text-center py-4">過去の配置データがありません</p>
      ) : (
        <div className="space-y-2.5">
          {SLOT_ORDER.map((slot) => {
            const counts = staffTally[slot];
            const entries = counts ? Object.entries(counts).sort((a, b) => b[1] - a[1]) : [];
            if (entries.length === 0) return null;
            const style = TIME_SLOT_STYLES[slot] || {};
            return (
              <div key={slot} className="rounded-lg border border-border overflow-hidden">
                <div className={`px-2 py-1 text-[11px] font-bold ${style.header || "bg-muted text-muted-foreground"}`}>
                  {slot}
                </div>
                <div className="p-1.5 space-y-1">
                  {entries.map(([posName, count]) => {
                    const max = entries[0][1];
                    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
                    return (
                      <div key={posName} className="flex items-center gap-2">
                        <span className="text-xs text-foreground min-w-0 flex-1 truncate">{posName}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground w-6 text-right shrink-0">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground text-center">※直近10イベントの配置実績から集計</p>
    </ModalShell>
  );
}