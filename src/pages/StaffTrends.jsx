import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, Table as TableIcon, BarChart3, Users } from "lucide-react";
import BackButton from "@/components/BackButton";
import CrewlyLogo from "@/components/CrewlyLogo";
import GlobalBanner from "@/components/GlobalBanner";
import { useUserRole } from "@/hooks/useUserRole";
import { useStaffTrends, SLOT_ORDER } from "@/hooks/useStaffTrends";
import { TIME_SLOT_STYLES } from "@/lib/constants";

const SLOT_COLORS = {
  "開場中": "#f59e0b",
  "開演中": "#3b82f6",
  "終演後": "#64748b",
};

function getMostFrequent(slotCounts) {
  if (!slotCounts) return null;
  let maxName = null;
  let maxCount = 0;
  Object.entries(slotCounts).forEach(([posName, count]) => {
    if (count > maxCount || (count === maxCount && posName < maxName)) {
      maxName = posName;
      maxCount = count;
    }
  });
  return maxName ? { name: maxName, count: maxCount } : null;
}

export default function StaffTrends() {
  const { tally, recentEvents } = useStaffTrends();
  const [view, setView] = useState("table"); // "table" | "chart"
  const [selectedSlot, setSelectedSlot] = useState("開場中");
  const { role } = useUserRole();

  // Table data: staffName -> { slot -> { name, count } }
  const tableRows = useMemo(() => {
    return Object.keys(tally)
      .sort((a, b) => a.localeCompare(b, "ja"))
      .map((name) => {
        const row = { name };
        SLOT_ORDER.forEach((slot) => {
          row[slot] = getMostFrequent(tally[name][slot]);
        });
        return row;
      });
  }, [tally]);

  // Chart data: for selected slot, position -> total count across all staff
  const chartData = useMemo(() => {
    const posTotals = {};
    Object.values(tally).forEach((slots) => {
      const slotCounts = slots[selectedSlot];
      if (!slotCounts) return;
      Object.entries(slotCounts).forEach(([posName, count]) => {
        posTotals[posName] = (posTotals[posName] || 0) + count;
      });
    });
    return Object.entries(posTotals)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [tally, selectedSlot]);

  return (
    <div className="min-h-screen bg-background safe-area-top safe-area-bottom relative scrollbar-hide overflow-x-hidden">
      <GlobalBanner />
      {/* Header */}
      <div className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-5xl mx-auto px-2 pb-1.5 pt-1 flex items-center gap-1.5">
          <BackButton to="/events" label="イベント一覧へ戻る" />
          <CrewlyLogo className="mr-1" administrator={role === "admin"} />
          <h1 className="shrink-0 text-base font-bold tracking-tight text-foreground">配置傾向分析</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-2 py-3 pb-16">
        {/* Summary */}
        <div className="bg-card border border-border rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">直近{recentEvents.length}イベントの集計</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            過去{recentEvents.length}件のイベントから、スタッフごとのポジション配置傾向を集計しました。
            {recentEvents.length > 0 && (
              <span className="block mt-1">
                対象: {recentEvents.map((e) => e.name).join("、")}
              </span>
            )}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "table" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />表
          </button>
          <button
            onClick={() => setView("chart")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              view === "chart" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />グラフ
          </button>
        </div>

        {Object.keys(tally).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">集計データがありません</p>
            <p className="text-xs mt-1">イベントの配置データが蓄積されると表示されます</p>
          </div>
        ) : view === "table" ? (
          /* Table view */
          <div className="bg-card border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-2 py-2 font-semibold whitespace-nowrap">スタッフ名</th>
                  {SLOT_ORDER.map((slot) => (
                    <th key={slot} className="text-left px-2 py-2 font-semibold whitespace-nowrap min-w-24">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${TIME_SLOT_STYLES[slot]?.badge || ""}`}>{slot}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={row.name} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                    <td className="px-2 py-1.5 font-medium whitespace-nowrap">{row.name}</td>
                    {SLOT_ORDER.map((slot) => {
                      const freq = row[slot];
                      return (
                        <td key={slot} className="px-2 py-1.5">
                          {freq ? (
                            <div className="flex items-center gap-1">
                              <span className="whitespace-nowrap">{freq.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">({freq.count}回)</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Chart view */
          <div>
            {/* Slot selector */}
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

            {chartData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-sm">{selectedSlot}の配置データがありません</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-3">
                <h3 className="text-xs font-semibold mb-2 text-muted-foreground">
                  {selectedSlot}のポジション別配置回数（上位15件）
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 28)}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value) => [`${value}回`, "配置回数"]}
                    />
                    <Bar dataKey="count" fill={SLOT_COLORS[selectedSlot]} radius={[0, 4, 4, 0]} name="配置回数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}