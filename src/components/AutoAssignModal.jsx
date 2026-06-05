import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wand2, X, ChevronRight } from "lucide-react";
import { TIME_SLOTS, TIME_SLOT_STYLES } from "@/lib/constants";

export function computeAutoAssign(positions, staffList) {
  // 時間帯ごとに処理
  const plan = {}; // { positionId: [staffName, ...] }
  const warnings = []; // 不足ポジション名

  TIME_SLOTS.forEach((slot) => {
    const slotPositions = positions
      .filter((p) => (p.time_slot || "開場中") === slot)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (slotPositions.length === 0) return;

    // このスロットで既に配置済みのスタッフ
    const alreadyAssignedInSlot = new Set(
      slotPositions.flatMap((p) => p.staff_names || [])
    );

    // このスロットで未配置のスタッフを抽出
    const unassignedInSlot = staffList.filter(
      (s) => !alreadyAssignedInSlot.has(s.name)
    );

    if (unassignedInSlot.length === 0) return;

    // 未配置スロット数（全時間帯での未配置時間帯数）でソート（多い順 = 優先）
    const prioritized = [...unassignedInSlot].sort((a, b) => {
      const countUnassigned = (staff) =>
        TIME_SLOTS.filter(
          (sl) => !positions.some(
            (p) => (p.time_slot || "開場中") === sl && (p.staff_names || []).includes(staff.name)
          )
        ).length;
      return countUnassigned(b) - countUnassigned(a);
    });

    // 各ポジションへ割り当て
    // plan[posId] に追加予定スタッフを蓄積
    const slotPlan = {}; // posId -> [newStaff]
    const assignedThisRound = new Set();

    slotPositions.forEach((pos) => {
      slotPlan[pos.id] = [];
    });

    prioritized.forEach((staff) => {
      if (assignedThisRound.has(staff.name)) return;
      // required_count が 0 のポジションはスキップ
      for (const pos of slotPositions) {
        if ((pos.required_count ?? 0) === 0) continue;
        const currentCount = (pos.staff_names || []).length + (slotPlan[pos.id] || []).length;
        if (currentCount < (pos.required_count ?? 0)) {
          slotPlan[pos.id].push(staff.name);
          assignedThisRound.add(staff.name);
          break;
        }
      }
    });

    // plan へマージ
    Object.entries(slotPlan).forEach(([posId, names]) => {
      if (names.length > 0) {
        plan[posId] = names;
      }
    });

    // 不足チェック
    slotPositions.forEach((pos) => {
      if ((pos.required_count ?? 0) === 0) return;
      const totalAfter =
        (pos.staff_names || []).length + (slotPlan[pos.id] || []).length;
      if (totalAfter < (pos.required_count ?? 0)) {
        warnings.push({ slot, posName: pos.name, required: pos.required_count, actual: totalAfter });
      }
    });
  });

  return { plan, warnings };
}

export default function AutoAssignModal({ positions, staffList, onConfirm, onCancel }) {
  const { plan, warnings } = computeAutoAssign(positions, staffList);

  const totalAssignments = Object.values(plan).reduce((s, arr) => s + arr.length, 0);

  // 表示用: 時間帯 -> [{posName, staffNames}]
  const displayBySlot = TIME_SLOTS.map((slot) => {
    const slotPositions = positions.filter((p) => (p.time_slot || "開場中") === slot);
    const items = slotPositions
      .map((pos) => ({ posName: pos.name, newStaff: plan[pos.id] || [] }))
      .filter((item) => item.newStaff.length > 0);
    return { slot, items };
  }).filter((s) => s.items.length > 0);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wand2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">自動配置プレビュー</h2>
              <p className="text-[11px] text-muted-foreground">計{totalAssignments}名を自動割り当て</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* 警告バナー */}
        {warnings.length > 0 && (
          <div className="mx-4 mt-3 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 shrink-0">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">一部ポジションで人数が不足しています</p>
                <ul className="mt-1 space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i} className="text-[11px] text-amber-700 dark:text-amber-400">
                      {w.slot}：{w.posName}（{w.actual}/{w.required}名）
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 割り当て一覧 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {totalAssignments === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              割り当て可能なスタッフがいません
            </div>
          ) : (
            displayBySlot.map(({ slot, items }) => {
              const style = TIME_SLOT_STYLES[slot];
              return (
                <div key={slot}>
                  <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold mb-1.5 ${style.header}`}>
                    {slot}
                  </div>
                  <div className="space-y-1">
                    {items.map(({ posName, newStaff }) =>
                      newStaff.map((name) => (
                        <div key={`${posName}-${name}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs">
                          <span className="font-medium text-foreground">{name}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{posName}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* フッター */}
        <div className="flex gap-2 px-4 pb-4 pt-3 border-t border-border shrink-0">
          <Button variant="outline" className="flex-1" onClick={onCancel}>キャンセル</Button>
          <Button
            className="flex-1 gap-1"
            disabled={totalAssignments === 0}
            onClick={() => onConfirm(plan)}
          >
            <Wand2 className="w-3.5 h-3.5" />
            {warnings.length > 0 ? "それでも実行" : "実行"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}