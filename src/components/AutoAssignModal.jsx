import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Wand2, X, ChevronRight, Lock, LockOpen, ChevronDown } from "lucide-react";
import { TIME_SLOTS, TIME_SLOT_STYLES, CONTINUOUS_SLOT } from "@/lib/constants";
import { useAllRoles } from "@/hooks/useAllRoles";

// 開演中（本番）の過去配置回数にかける重み。他の時間帯より強く優先させる。
const MAIN_SLOT_WEIGHT = 3;

// スタッフがポジションの必要スキルにどれだけマッチするかのスコア（0〜）
function skillMatchScore(staff, pos) {
  const required = pos.required_skills || [];
  if (required.length === 0) return 0;
  const staffSkills = staff.skills || [];
  return required.filter((s) => staffSkills.includes(s)).length;
}

// スタッフがポジションの必要役割にどれだけマッチするかのスコア
function roleMatchScore(staff, pos) {
  const requiredRoles = pos.required_roles || [];
  if (requiredRoles.length === 0) return 0;
  const staffRoles = staff.roles || [];
  return requiredRoles.filter((r) => staffRoles.includes(r)).length;
}

// ポジション名 → category のマップを現在の positions から構築
function buildPosNameCategoryMap(positions) {
  const map = {};
  (positions || []).forEach((p) => {
    if (p.category) map[p.name] = p.category;
  });
  return map;
}

// 条件①: 同一ポジション名への過去配置回数スコア（開演中は MAIN_SLOT_WEIGHT 倍）
function samePosScore(staff, pos, slot, tally) {
  const count = ((tally[staff.name] || {})[slot] || {})[pos.name] || 0;
  return count * (slot === "開演中" ? MAIN_SLOT_WEIGHT : 1);
}

// 条件②: 同一 category（属性）への過去配置回数スコア（同一ポジション名を除く）
function categoryScore(staff, pos, slot, tally, posNameCategory) {
  const cat = pos.category || posNameCategory[pos.name];
  if (!cat) return 0;
  const slotTally = (tally[staff.name] || {})[slot] || {};
  let total = 0;
  for (const [pn, cnt] of Object.entries(slotTally)) {
    if (pn === pos.name) continue;
    if (posNameCategory[pn] === cat) total += cnt;
  }
  return total;
}

// 条件4: クロスタイムスロット共通配置 — 同一ポジション名が複数時間帯に存在するか検出しグループ化
function detectCommonGroups(positions) {
  const byName = {};
  (positions || []).forEach((p) => {
    (byName[p.name] ||= []).push(p);
  });
  return Object.values(byName).filter(
    (ps) => new Set(ps.map((p) => p.time_slot || "開場中")).size > 1
  );
}

/**
 * 自動配置を計算する。
 * @param {Array} positions 対象イベントのポジション一覧
 * @param {Array} staffList ロック除外済みの割り当て候補スタッフ一覧
 * @param {Object} tally useStaffTrends の { [staffName]: { [slot]: { [posName]: count } } }
 * @returns {{ plan: Object, warnings: Array, reasons: Object }}
 *   plan:    { [posId]: [staffName, ...] }
 *   reasons: { [posId]: { [staffName]: { slot, samePosCount, categoryCount, isMainSlot } } }
 */
export function computeAutoAssign(positions, staffList, tally = {}) {
  const plan = {};
  const warnings = [];
  const reasons = {};
  const posNameCategory = buildPosNameCategoryMap(positions);

  const positionSlots = [...new Set(positions.map((p) => p.time_slot || "開場中"))];
  const activeSlots = positionSlots.length > 0 ? positionSlots : TIME_SLOTS;

  // slot -> Set(staffName): 既存配置＋自動配置を含む「その時間帯で既に配置済み」の集合
  const assignedInSlot = {};
  activeSlots.forEach((sl) => { assignedInSlot[sl] = new Set(); });
  (positions || []).forEach((p) => {
    const slot = p.time_slot || "開場中";
    (p.staff_names || []).forEach((n) => assignedInSlot[slot]?.add(n));
  });

  const countUnassigned = (staff) =>
    activeSlots.filter((sl) => !assignedInSlot[sl].has(staff.name)).length;

  const candidatesForSlot = (slot) =>
    staffList.filter((s) => !assignedInSlot[slot].has(s.name));

  function addToPlan(pos, name, slot) {
    (plan[pos.id] ||= []).push(name);
    (reasons[pos.id] ||= {})[name] = {
      slot,
      samePosCount: ((tally[name] || {})[slot] || {})[pos.name] || 0,
      categoryCount: categoryScore({ name }, pos, slot, tally, posNameCategory),
      isMainSlot: slot === "開演中",
    };
    assignedInSlot[slot].add(name);
  }

  // レキシカルソート比較関数: ①同一pos回数 → ②同カテゴリ回数 → ③スキル/役割 → ④未配置スロット数(均等)
  const cmp = (a, b, pos, slot) => {
    const sA = samePosScore(a, pos, slot, tally);
    const sB = samePosScore(b, pos, slot, tally);
    if (sA !== sB) return sB - sA;
    const cA = categoryScore(a, pos, slot, tally, posNameCategory);
    const cB = categoryScore(b, pos, slot, tally, posNameCategory);
    if (cA !== cB) return cB - cA;
    const rA = roleMatchScore(a, pos) + skillMatchScore(a, pos);
    const rB = roleMatchScore(b, pos) + skillMatchScore(b, pos);
    if (rA !== rB) return rB - rA;
    return countUnassigned(b) - countUnassigned(a);
  };

  // --- Phase 0: クロスタイムスロット共通配置（条件4） ---
  detectCommonGroups(positions).forEach((group) => {
    const commonCount = Math.max(...group.map((p) => p.required_count || 0));
    if (commonCount <= 0) return;
    const groupSlots = [...new Set(group.map((p) => p.time_slot || "開場中"))];

    // 共通メンバーは全時間帯でフリーである必要がある
    let candidates = staffList.filter((s) =>
      groupSlots.every((sl) => !assignedInSlot[sl].has(s.name))
    );
    // クロススロットスコア: 各時間帯の同一pos回数（開演中は重み付き）の総和
    const crossScore = (staff) => {
      let total = 0;
      group.forEach((p) => {
        const slot = p.time_slot || "開場中";
        const cnt = ((tally[staff.name] || {})[slot] || {})[p.name] || 0;
        total += cnt * (slot === "開演中" ? MAIN_SLOT_WEIGHT : 1);
      });
      return total;
    };
    const crossCat = (staff) => {
      let total = 0;
      group.forEach((p) => {
        total += categoryScore(staff, p, p.time_slot || "開場中", tally, posNameCategory);
      });
      return total;
    };
    candidates.sort((a, b) => {
      const sa = crossScore(a), sb = crossScore(b);
      if (sa !== sb) return sb - sa;
      const ca = crossCat(a), cb = crossCat(b);
      if (ca !== cb) return cb - ca;
      const ra = group.reduce((acc, p) => acc + roleMatchScore(a, p) + skillMatchScore(a, p), 0);
      const rb = group.reduce((acc, p) => acc + roleMatchScore(b, p) + skillMatchScore(b, p), 0);
      if (ra !== rb) return rb - ra;
      return countUnassigned(b) - countUnassigned(a);
    });

    const commonMembers = candidates.slice(0, commonCount);
    group.forEach((p) => {
      const slot = p.time_slot || "開場中";
      const need = p.required_count || 0;
      const take = Math.min(commonMembers.length, need);
      for (let i = 0; i < take; i++) {
        addToPlan(p, commonMembers[i].name, slot);
      }
    });
  });

  // --- Phase 1 & 2: 開演中を優先 → 残り時間帯（条件5・条件1〜3） ---
  const slotOrder = activeSlots.includes("開演中")
    ? ["開演中", ...activeSlots.filter((sl) => sl !== "開演中")]
    : activeSlots;

  slotOrder.forEach((slot) => {
    const slotPositions = (positions || [])
      .filter((p) => (p.time_slot || "開場中") === slot)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (slotPositions.length === 0) return;

    slotPositions.forEach((pos) => {
      const already = (pos.staff_names || []).length + (plan[pos.id] || []).length;
      const needed = (pos.required_count ?? 0) - already;
      if (needed <= 0) return;
      const candidates = candidatesForSlot(slot)
        .filter((s) => !(plan[pos.id] || []).includes(s.name))
        .sort((a, b) => cmp(a, b, pos, slot));
      let filled = 0;
      for (const staff of candidates) {
        if (filled >= needed) break;
        addToPlan(pos, staff.name, slot);
        filled++;
      }
    });
  });

  // warnings
  activeSlots.forEach((slot) => {
    (positions || [])
      .filter((p) => (p.time_slot || "開場中") === slot)
      .forEach((pos) => {
        if ((pos.required_count ?? 0) === 0) return;
        const totalAfter = (pos.staff_names || []).length + (plan[pos.id] || []).length;
        if (totalAfter < (pos.required_count ?? 0)) {
          warnings.push({ slot, posName: pos.name, required: pos.required_count, actual: totalAfter });
        }
      });
  });

  return { plan, warnings, reasons };
}

// 配置根拠バッジのクラス
function trendBadgeClass(reason) {
  if (!reason) return null;
  const { samePosCount, categoryCount, isMainSlot } = reason;
  if (samePosCount > 0) {
    return isMainSlot
      ? "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
      : "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300";
  }
  if (categoryCount > 0) {
    return "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300";
  }
  return "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400";
}

function trendBadgeText(reason) {
  if (!reason) return null;
  const { samePosCount, categoryCount, isMainSlot } = reason;
  if (samePosCount > 0) return isMainSlot ? `開演中 ${samePosCount}回` : `傾向あり ${samePosCount}回`;
  if (categoryCount > 0) return "属性一致";
  return "傾向なし";
}

export default function AutoAssignModal({ positions, staffList, lockedNames = [], tally = {}, onConfirm, onCancel, onClearLocks }) {
  const [lockedSectionOpen, setLockedSectionOpen] = useState(false);
  const { getBadgeClass } = useAllRoles();

  // ロック中スタッフを除外して計算
  const freeStaffList = staffList.filter((s) => !lockedNames.includes(s.name));
  const { plan, warnings, reasons } = computeAutoAssign(positions, freeStaffList, tally);

  const totalAssignments = Object.values(plan).reduce((s, arr) => s + arr.length, 0);

  const positionSlots = [...new Set(positions.map((p) => p.time_slot || "開場中"))];
  const activeSlots = positionSlots.length > 0 ? positionSlots : TIME_SLOTS;
  const displayBySlot = activeSlots.map((slot) => {
    const slotPositions = positions.filter((p) => (p.time_slot || "開場中") === slot);
    const items = slotPositions
      .map((pos) => ({ posName: pos.name, posId: pos.id, newStaff: plan[pos.id] || [] }))
      .filter((item) => item.newStaff.length > 0);
    return { slot, items };
  }).filter((s) => s.items.length > 0);

  // ロック中スタッフのポジション情報
  const lockedStaffInfo = lockedNames.map((name) => {
    const assignedPositions = positions
      .filter((p) => (p.staff_names || []).includes(name))
      .map((p) => `${p.time_slot || "開場中"}：${p.name}`);
    return { name, assignedPositions };
  });

  return (
    <motion.div
      className="fixed inset-0 z-[100] h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90dvh]"
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

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* ロック中スタッフセクション */}
          {lockedStaffInfo.length > 0 && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-700 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-900/30 text-left"
                onClick={() => setLockedSectionOpen((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    固定済み（ロック中）{lockedStaffInfo.length}名 — 計算対象外
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-600 transition-transform ${lockedSectionOpen ? "rotate-180" : ""}`} />
              </button>
              {lockedSectionOpen && (
                <div className="px-3 py-2 space-y-1 bg-amber-50/50 dark:bg-amber-900/10">
                  {lockedStaffInfo.map(({ name, assignedPositions }) => (
                    <div key={name} className="flex items-start gap-2 py-0.5">
                      <Lock className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-foreground">{name}</span>
                        {assignedPositions.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {assignedPositions.map((pos) => (
                              <span key={pos} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">
                                {pos}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground ml-1">未配置</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {onClearLocks && (
                    <button
                      onClick={onClearLocks}
                      className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 hover:underline"
                    >
                      <LockOpen className="w-3 h-3" />ロックを全解除
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 警告バナー */}
          {warnings.length > 0 && (
            <div className="px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
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
                    {items.map(({ posName, posId, newStaff }) =>
                      newStaff.map((name) => {
                        const staffObj = staffList.find((s) => s.name === name);
                        const posObj = positions.find((p) => p.id === posId);
                        const matchedSkills = posObj && staffObj
                          ? (posObj.required_skills || []).filter((s) => (staffObj.skills || []).includes(s))
                          : [];
                        const matchedRoles = posObj && staffObj
                          ? (posObj.required_roles || []).filter((r) => (staffObj.roles || []).includes(r))
                          : [];
                        const reason = reasons[posId]?.[name];
                        const badgeClass = trendBadgeClass(reason);
                        const badgeText = trendBadgeText(reason);
                        return (
                          <div key={`${posName}-${name}`} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-xs">
                            <span className="font-medium text-foreground">{name}</span>
                            {badgeText && badgeClass && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                                {badgeText}
                              </span>
                            )}
                            {matchedRoles.map((r) => (
                              <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${getBadgeClass(r)}`}>
                                {r}
                              </span>
                            ))}
                            {matchedSkills.length > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                                {matchedSkills.join("・")}
                              </span>
                            )}
                            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">{posName}</span>
                          </div>
                        );
                      })
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