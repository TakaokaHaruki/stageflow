import { useMemo, useState } from "react";
import { SLOT_ORDER } from "@/hooks/useStaffTrends";

function normalizeSlot(slot) {
  return slot === "開場前" ? "開場中" : slot || "開場中";
}

function getHeatmapClass(count, maxCount) {
  if (count === 0 || maxCount === 0) return "";
  const ratio = count / maxCount;
  if (ratio >= 0.67) return "bg-primary/80 text-primary-foreground";
  if (ratio >= 0.34) return "bg-primary/50 text-primary-foreground";
  return "bg-primary/20";
}

export default function PositionHeatmap({ recentEvents, positionsPerEvent }) {
  const [selectedSlot, setSelectedSlot] = useState("開場中");

  const { rows, maxCount, positionNames } = useMemo(() => {
    const posMap = {};
    const posTotals = {};

    (positionsPerEvent || []).forEach((positions, eventIdx) => {
      (positions || []).forEach((pos) => {
        const slot = normalizeSlot(pos.time_slot);
        if (slot !== selectedSlot) return;
        const posName = pos.name || pos.role || "";
        if (!posName) return;
        const names = pos.split_by_side
          ? [...new Set([...(pos.staff_names_kamite || []), ...(pos.staff_names_shimote || [])])]
          : (pos.staff_names || []);
        const count = names.length;
        if (count === 0) return;
        if (!posMap[posName]) posMap[posName] = {};
        posMap[posName][eventIdx] = (posMap[posName][eventIdx] || 0) + count;
        posTotals[posName] = (posTotals[posName] || 0) + count;
      });
    });

    const sortedNames = Object.keys(posTotals).sort((a, b) => posTotals[b] - posTotals[a]);
    let max = 0;
    sortedNames.forEach((name) => {
      recentEvents.forEach((_, idx) => {
        const c = posMap[name]?.[idx] || 0;
        if (c > max) max = c;
      });
    });

    return { rows: posMap, maxCount: max, positionNames: sortedNames };
  }, [positionsPerEvent, recentEvents, selectedSlot]);

  const slotSelector = (
    <div className="flex gap-1 mb-3">
      {SLOT_ORDER.map((slot) => (
        <button
          key={slot}
          onClick={() => setSelectedSlot(slot)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            selectedSlot === slot ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );

  if (positionNames.length === 0) {
    return (
      <div>
        {slotSelector}
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">{selectedSlot}の配置データがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {slotSelector}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-2 py-2 font-semibold whitespace-nowrap sticky left-0 bg-card z-10 border-r border-border">
                ポジション
              </th>
              {recentEvents.map((event) => (
                <th key={event.id} className="px-1 py-2 font-semibold min-w-14 max-w-24">
                  <div className="text-center truncate" title={event.name}>
                    {event.name}
                  </div>
                  {event.date && (
                    <div className="text-[9px] text-muted-foreground text-center font-normal whitespace-nowrap">
                      {event.date.slice(5)}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positionNames.map((posName) => (
              <tr key={posName} className="border-b border-border/50">
                <td
                  className="px-2 py-1.5 font-medium whitespace-nowrap sticky left-0 bg-card z-10 border-r border-border max-w-32 truncate"
                  title={posName}
                >
                  {posName}
                </td>
                {recentEvents.map((_, eventIdx) => {
                  const count = rows[posName]?.[eventIdx] || 0;
                  return (
                    <td key={eventIdx} className="px-1 py-1 text-center min-w-14">
                      <div className={`py-1.5 rounded ${getHeatmapClass(count, maxCount)}`}>
                        {count > 0 ? count : <span className="text-muted-foreground/30">—</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}