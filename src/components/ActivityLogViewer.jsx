import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { History, RotateCcw, ChevronDown, ChevronUp, Trash2, ChevronRight, ArrowRight, User, ClipboardList, Settings, CheckSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";

function formatLogTimeJST(log) {
  let dateStr;
  if (log.logged_at_jst) {
    dateStr = log.logged_at_jst;
  } else if (log.created_date) {
    dateStr = new Date(log.created_date).toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).replace("T", " ").slice(0, 16);
  } else {
    return "";
  }
  const [d, t] = dateStr.split(" ");
  const [y, m, day] = d.split("-");
  const wd = ["日","月","火","水","木","金","土"][new Date(parseInt(y), parseInt(m)-1, parseInt(day)).getDay()];
  return `${parseInt(m)}/${parseInt(day)}(${wd}) ${t}`;
}

function getLogDate(log) {
  let dateStr;
  if (log.logged_at_jst) {
    dateStr = log.logged_at_jst;
  } else if (log.created_date) {
    dateStr = new Date(log.created_date).toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 10);
  } else {
    return "";
  }
  return dateStr.split(" ")[0];
}

const ACTION_LABELS = {
  staff_add: { label: "スタッフ追加", color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  staff_delete: { label: "スタッフ削除", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
  staff_update: { label: "スタッフ更新", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  position_assign: { label: "配置割当", color: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700" },
  position_unassign: { label: "配置解除", color: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" },
  position_add: { label: "ポジション追加", color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  position_delete: { label: "ポジション削除", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
  position_reorder: { label: "順序変更", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
  chief_update: { label: "チーフ変更", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" },
  feature_toggle: { label: "機能設定", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
  announcement_create: { label: "連絡作成", color: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700" },
  announcement_delete: { label: "連絡削除", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
  preset_apply: { label: "プリセット適用", color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
  preset_save: { label: "プリセット保存", color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" },
  preset_clear: { label: "プリセット解除", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
  position_type_add: { label: "Pタイプ追加", color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  position_type_delete: { label: "Pタイプ削除", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
  position_type_reorder: { label: "Pタイプ並替", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
  position_type_side_toggle: { label: "上手/下手切替", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" },
  task_add: { label: "タスク追加", color: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  task_toggle: { label: "タスク完了", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  task_delete: { label: "タスク削除", color: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700" },
  event_update: { label: "イベント更新", color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600" },
};

const FIELD_LABELS = {
  name: "名前",
  note: "備考（共通）",
  note_before: "備考（開場中）",
  note_during: "備考（開演中）",
  note_after: "備考（終演後）",
  color: "色",
  skills: "スキル",
  costume_change: "着替え",
  break: "休憩",
  staff_names: "配置スタッフ",
  staff_names_kamite: "上手スタッフ",
  staff_names_shimote: "下手スタッフ",
  split_by_side: "上手/下手分割",
  chief_staff_name: "チーフ",
  time_slot: "時間帯",
  notes: "備考",
  required_count: "必要人数",
};

const UNDOABLE_ACTIONS = ["staff_add", "staff_delete", "position_assign", "position_unassign", "position_add", "position_delete", "chief_update"];

const CATEGORY_MAP = {
  staff: ["staff_add", "staff_delete", "staff_update"],
  position: ["position_assign", "position_unassign", "position_add", "position_delete", "position_reorder"],
  settings: ["chief_update", "feature_toggle", "event_update", "preset_apply", "preset_save", "preset_clear", "position_type_add", "position_type_delete", "position_type_reorder", "position_type_side_toggle", "announcement_create", "announcement_delete"],
  task: ["task_add", "task_toggle", "task_delete"],
};

const CATEGORY_FILTERS = [
  { id: "all", label: "全て" },
  { id: "staff", label: "スタッフ操作" },
  { id: "position", label: "配置操作" },
  { id: "settings", label: "設定操作" },
  { id: "task", label: "タスク操作" },
];

const CATEGORY_ICONS = {
  staff: User,
  position: ClipboardList,
  settings: Settings,
  task: CheckSquare,
  other: History,
};

const CATEGORY_DOT_COLORS = {
  staff: "bg-green-500",
  position: "bg-indigo-500",
  settings: "bg-slate-500",
  task: "bg-blue-500",
  other: "bg-gray-400",
};

function getCategory(actionType) {
  for (const [cat, types] of Object.entries(CATEGORY_MAP)) {
    if (types.includes(actionType)) return cat;
  }
  return "other";
}

function formatValue(val) {
  if (val === null || val === undefined) return "（なし）";
  if (typeof val === "boolean") return val ? "はい" : "いいえ";
  if (Array.isArray(val)) return val.length === 0 ? "（なし）" : val.join("、");
  return String(val) || "（なし）";
}

function DiffTable({ before, after, label }) {
  const beforeObj = before || {};
  const afterObj = after || {};
  const allKeys = [...new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])].filter(
    (k) => !["id", "event_id", "created_date", "updated_date", "created_by_id"].includes(k)
  );
  const changedKeys = allKeys.filter((k) => JSON.stringify(beforeObj[k]) !== JSON.stringify(afterObj[k]));

  if (changedKeys.length === 0 && allKeys.length === 0) return null;
  const displayKeys = changedKeys.length > 0 ? changedKeys : allKeys.slice(0, 6);

  return (
    <div className="mt-1.5">
      {label && <p className="text-[10px] font-bold text-muted-foreground mb-0.5">{label}</p>}
      <div className="rounded border border-border overflow-hidden text-[11px]">
        {displayKeys.map((key, i) => {
          const bVal = beforeObj[key];
          const aVal = afterObj[key];
          const changed = JSON.stringify(bVal) !== JSON.stringify(aVal);
          const fieldLabel = FIELD_LABELS[key] || key;
          return (
            <div key={key} className={`flex items-start gap-1 px-1.5 py-0.5 ${i > 0 ? "border-t border-border/50" : ""} ${changed ? "bg-amber-50/60 dark:bg-amber-900/10" : ""}`}>
              <span className="text-muted-foreground w-16 shrink-0 pt-0.5">{fieldLabel}</span>
              <span className={`flex-1 ${changed ? "text-red-600 dark:text-red-400 line-through opacity-70" : "text-foreground"}`}>
                {formatValue(bVal)}
              </span>
              {changed && (
                <>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="flex-1 text-green-700 dark:text-green-400 font-medium">{formatValue(aVal)}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UndoConfirmModal({ log, onConfirm, onCancel }) {
  const before = log.snapshot_before || {};
  const after = log.snapshot_after || {};
  const meta = ACTION_LABELS[log.action_type] || { label: log.action_type, color: "bg-slate-100 text-slate-700 border-slate-300" };
  const timeStr = formatLogTimeJST(log);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start gap-2 mb-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <RotateCcw className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">この操作を復元しますか？</p>
            <p className="text-xs text-muted-foreground mt-0.5">{log.description}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
              {log.actor_name && <span className="text-[10px] text-muted-foreground">操作者：{log.actor_name}</span>}
              <span className="text-[10px] text-muted-foreground">{timeStr}</span>
            </div>
          </div>
        </div>

        <div className="bg-muted/40 rounded-lg p-2.5 mb-3">
          <p className="text-[11px] font-bold text-muted-foreground mb-1">変更の差分（復元後 → 現在）</p>
          <DiffTable before={before} after={after} />
          {Object.keys(before).length === 0 && Object.keys(after).length === 0 && (
            <p className="text-[11px] text-muted-foreground">詳細データなし</p>
          )}
        </div>

        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 mb-3">
          ⚠ 復元すると現在のデータが上書きされます。
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>キャンセル</Button>
          <Button className="flex-1" onClick={onConfirm}>
            <RotateCcw className="w-3.5 h-3.5 mr-1" />復元する
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TimelineLogEntry({ log, onUndo, undoPending, isLast }) {
  const [showDetail, setShowDetail] = useState(false);
  const meta = ACTION_LABELS[log.action_type] || { label: log.action_type, color: "bg-slate-100 text-slate-700 border-slate-300" };
  const canUndo = UNDOABLE_ACTIONS.includes(log.action_type) && !log.is_undone;
  const timeStr = formatLogTimeJST(log);
  const hasDiff = Object.keys(log.snapshot_before || {}).length > 0 || Object.keys(log.snapshot_after || {}).length > 0;
  const category = getCategory(log.action_type);
  const CategoryIcon = CATEGORY_ICONS[category];

  return (
    <div className="flex gap-2 relative">
      {/* Timeline column */}
      <div className="relative flex flex-col items-center shrink-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${CATEGORY_DOT_COLORS[category]}`}>
          <CategoryIcon className="w-3 h-3 text-white" />
        </div>
        {!isLast && <div className="flex-1 w-px bg-border min-h-4" />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isLast ? "pb-1" : "pb-3"}`}>
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.color}`}>
                {meta.label}
              </span>
              {log.is_undone && (
                <span className="text-[10px] text-muted-foreground border border-border rounded px-1">復元済</span>
              )}
            </div>
            <p className={`text-xs mt-0.5 ${log.is_undone ? "opacity-40" : ""}`}>{log.description}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {log.actor_name && (
                <span className="text-[10px] text-muted-foreground font-medium">{log.actor_name}</span>
              )}
              <span className="text-[10px] text-muted-foreground">{timeStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasDiff && (
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="flex items-center gap-0.5 text-[11px] px-1.5 py-1 rounded border border-border hover:border-primary/50 hover:text-primary text-muted-foreground transition-colors"
                title="詳細を表示"
              >
                <ChevronRight className={`w-3 h-3 transition-transform ${showDetail ? "rotate-90" : ""}`} />
                詳細
              </button>
            )}
            {canUndo && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] px-2 gap-1 shrink-0"
                onClick={() => onUndo(log)}
                disabled={undoPending}
              >
                <RotateCcw className="w-3 h-3" />復元
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showDetail && hasDiff && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 bg-muted/30 rounded-lg p-1.5">
                <DiffTable
                  before={log.snapshot_before || {}}
                  after={log.snapshot_after || {}}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ActivityLogViewer({ eventId }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["operationLogs", eventId],
    queryFn: () => base44.entities.OperationLog.filter({ event_id: eventId }, "-created_date", 100),
    enabled: expanded,
    refetchInterval: expanded ? 15000 : false,
  });

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (categoryFilter !== "all") {
        const cat = getCategory(log.action_type);
        if (cat !== categoryFilter) return false;
      }
      const logDate = getLogDate(log);
      if (dateFrom && logDate && logDate < dateFrom) return false;
      if (dateTo && logDate && logDate > dateTo) return false;
      return true;
    });
  }, [logs, categoryFilter, dateFrom, dateTo]);

  const undoMutation = useMutation({
    mutationFn: async (log) => {
      const before = log.snapshot_before || {};

      if (log.action_type === "staff_add" && log.entity_id) {
        await base44.entities.Staff.delete(log.entity_id);
      } else if (log.action_type === "staff_delete" && before.name) {
        await base44.entities.Staff.create(before);
      } else if (log.action_type === "position_assign" && log.entity_id && before.staff_names !== undefined) {
        await base44.entities.Position.update(log.entity_id, {
          staff_names: before.staff_names,
          staff_names_kamite: before.staff_names_kamite || [],
          staff_names_shimote: before.staff_names_shimote || [],
          split_by_side: before.split_by_side || false,
        });
      } else if (log.action_type === "position_unassign" && log.entity_id && before.staff_names !== undefined) {
        await base44.entities.Position.update(log.entity_id, {
          staff_names: before.staff_names,
          staff_names_kamite: before.staff_names_kamite || [],
          staff_names_shimote: before.staff_names_shimote || [],
          split_by_side: before.split_by_side || false,
        });
      } else if (log.action_type === "position_add" && log.entity_id) {
        await base44.entities.Position.delete(log.entity_id);
      } else if (log.action_type === "position_delete" && before.event_id) {
        await base44.entities.Position.create(before);
      } else if (log.action_type === "chief_update" && log.entity_id) {
        await base44.entities.Event.update(log.entity_id, { chief_staff_name: before.chief_staff_name || "" });
      } else {
        throw new Error("この操作は復元できません");
      }

      await base44.entities.OperationLog.update(log.id, { is_undone: true });
    },
    onSuccess: () => {
      toast.success("操作を復元しました");
      queryClient.invalidateQueries({ queryKey: ["operationLogs", eventId] });
      queryClient.invalidateQueries({ queryKey: ["staff", eventId] });
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
    },
    onError: (e) => toast.error(`復元に失敗しました: ${e.message}`),
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const all = await base44.entities.OperationLog.filter({ event_id: eventId });
      await Promise.all(all.map((l) => base44.entities.OperationLog.delete(l.id)));
    },
    onSuccess: () => {
      toast.success("ログを削除しました");
      queryClient.invalidateQueries({ queryKey: ["operationLogs", eventId] });
      setConfirmClear(false);
    },
    onError: () => toast.error("ログの削除に失敗しました"),
  });

  const hasActiveFilters = categoryFilter !== "all" || dateFrom !== "" || dateTo !== "";

  return (
    <div className="mt-2 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2.5 py-2 bg-muted/50 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold">操作ログ・復元</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="bg-card">
          {/* Filter bar */}
          <div className="border-b border-border p-2 space-y-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {CATEGORY_FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors shrink-0 ${
                    categoryFilter === f.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
              />
              <span className="text-[10px] text-muted-foreground shrink-0">〜</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-[11px] border border-border rounded px-1.5 py-0.5 bg-background flex-1 min-w-0"
              />
              {hasActiveFilters && (
                <button
                  onClick={() => { setCategoryFilter("all"); setDateFrom(""); setDateTo(""); }}
                  className="text-[11px] text-muted-foreground hover:text-destructive transition-colors shrink-0 px-1"
                >
                  クリア
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              {logs.length === 0 ? "ログがありません" : "フィルター条件に一致するログがありません"}
            </p>
          ) : (
            <>
              <div className="px-2.5 py-2 max-h-[60vh] overflow-y-auto">
                {filteredLogs.map((log, idx) => (
                  <TimelineLogEntry
                    key={log.id}
                    log={log}
                    onUndo={setConfirmUndo}
                    undoPending={undoMutation.isPending}
                    isLast={idx === filteredLogs.length - 1}
                  />
                ))}
              </div>
              <div className="border-t border-border px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {hasActiveFilters ? `${filteredLogs.length}件 / 全${logs.length}件` : `${logs.length}件`}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmClear(true)}
                  disabled={clearMutation.isPending}
                >
                  <Trash2 className="w-3 h-3" />ログをすべて削除
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {confirmUndo && (
        <UndoConfirmModal
          log={confirmUndo}
          onConfirm={() => { undoMutation.mutate(confirmUndo); setConfirmUndo(null); }}
          onCancel={() => setConfirmUndo(null)}
        />
      )}
      {confirmClear && (
        <ConfirmDialog
          message="操作ログをすべて削除しますか？\nこの操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={() => clearMutation.mutate()}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}