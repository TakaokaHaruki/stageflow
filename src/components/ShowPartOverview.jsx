import { useMemo } from "react";
import { Users, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { TIME_SLOTS } from "@/lib/constants";
import { getParts, partLabel } from "@/lib/showParts";
import { getStaffDisplayName } from "@/lib/staffName";

/**
 * 部別の人員状況サマリー行
 */
function PartSlotRow({ slot, slotPositions, staffCount }) {
  const assignedNames = new Set(slotPositions.flatMap((p) => [
    ...(p.staff_names || []),
    ...(p.staff_names_kamite || []),
    ...(p.staff_names_shimote || []),
  ]));
  const required = slotPositions.reduce((sum, p) => sum + (p.required_count ?? 0), 0);
  const assigned = staffCount > 0 ? [...assignedNames].filter(() => true).length : 0;
  const diff = assigned - required;
  return (
    <div className="flex items-center justify-between gap-1.5 text-[11px] px-2 py-1 border-b border-border/60 last:border-b-0">
      <span className="font-medium text-foreground shrink-0">{slot}</span>
      <span className="text-muted-foreground">ポジション{slotPositions.length}</span>
      <span className="flex items-center gap-1.5 ml-auto shrink-0">
        <span className="text-muted-foreground">必要 {required}・配置 {assigned}</span>
        {diff < 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            <AlertTriangle className="w-2.5 h-2.5" />不足{-diff}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * 複数公演モード：全ての部の人員配置を一覧で確認するビュー
 * props:
 * - positions: 部フィルタ前の全ポジション
 * - staffList: スタッフ一覧
 * - partsCount: 部数
 * - showTimes: 部ごとの公演時刻
 * - maskStaffNames: スタッフ名をマスクするか
 */
export default function ShowPartOverview({ positions = [], staffList = [], partsCount = 1, showTimes = {}, maskStaffNames = false }) {
  const parts = Array.from({ length: partsCount }, (_, i) => i + 1);

  const partStats = useMemo(() => parts.map((part) => {
    const partPositions = positions.filter((p) => getParts(p).includes(part));
    const assignedNames = new Set(partPositions.flatMap((p) => [
      ...(p.staff_names || []),
      ...(p.staff_names_kamite || []),
      ...(p.staff_names_shimote || []),
    ]));
    return { part, positions: partPositions, assignedNames };
  }), [positions, partsCount]);

  const staffRows = useMemo(() => staffList.map((staff) => ({
    staff,
    parts: parts.map((part) => {
      const stat = partStats.find((s) => s.part === part) || { positions: [], assignedNames: new Set() };
      return partPositionsForStaff(stat.positions, staff.name);
    }),
  })), [staffList, partStats]);

  function partPositionsForStaff(partPositions, staffName) {
    return partPositions.filter((p) => {
      const all = [
        ...(p.staff_names || []),
        ...(p.staff_names_kamite || []),
        ...(p.staff_names_shimote || []),
      ];
      return all.includes(staffName);
    });
  }

  return (
    <div className="space-y-2">
      {/* 部別の人員状況 */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-sm font-bold">部別の人員状況</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {partStats.map(({ part, positions: partPositions, assignedNames }) => {
            const st = showTimes?.[String(part)] || {};
            const timeText = [
              st.time_open ? `開場 ${st.time_open}` : null,
              st.time_start ? `開演 ${st.time_start}` : null,
              st.time_end ? `終演 ${st.time_end}` : null,
            ].filter(Boolean);
            const isSufficient = assignedNames.size >= staffList.length;
            return (
              <div key={part} className="rounded-xl border border-border bg-card p-2 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-sm font-bold">{part}部</span>
                  <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    isSufficient ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                  }`}>
                    {isSufficient ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                    {isSufficient ? "充足" : "不足"}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                    <Users className="w-2.5 h-2.5" />{assignedNames.size}/{staffList.length}名
                  </span>
                </div>
                {timeText.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mb-1">{timeText.join("　")}</p>
                )}
                <div className="rounded-lg border border-border/70 bg-muted/30 divide-y divide-border/60">
                  {TIME_SLOTS.map((slot) => {
                    const slotPositions = partPositions.filter((p) => (p.time_slot || "開場中") === slot);
                    if (slotPositions.length === 0) return null;
                    return <PartSlotRow key={slot} slot={slot} slotPositions={slotPositions} staffCount={staffList.length} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* スタッフ別の部配置一覧 */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-sm font-bold">スタッフ別の部配置一覧</h3>
        </div>
        {staffRows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
            スタッフが登録されていません
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-[11px] min-w-[480px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-bold shrink-0">スタッフ</th>
                  {parts.map((part) => (
                    <th key={part} className="px-2 py-1.5 text-left font-bold min-w-[100px]">{part}部</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {staffRows.map(({ staff, parts: partAssignments }) => {
                  const displayName = getStaffDisplayName(staff.name, maskStaffNames);
                  return (
                    <tr key={staff.id}>
                      <td className="px-2 py-1.5 font-medium text-foreground align-top">{displayName}</td>
                      {partAssignments.map((ps, i) => (
                        <td key={i} className="px-2 py-1.5 align-top">
                          {ps.length === 0 ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-0.5">
                              {ps.map((p) => (
                                <span key={p.id} className="rounded-full bg-primary/10 border border-primary/30 text-primary px-1.5 py-0.5 font-medium" title={partLabel(getParts(p))}>
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}