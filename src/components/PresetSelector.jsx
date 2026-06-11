import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BookOpen, BookmarkPlus, ChevronDown, ChevronRight, ChevronUp, Zap } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useOperationLog } from "@/hooks/useOperationLog";
import { TIME_SLOTS, TIME_SLOT_STYLES } from "@/lib/constants";
import ConfirmDialog from "@/components/ConfirmDialog";
import SaveAsPresetModal from "@/components/SaveAsPresetModal";
import { loadEventById } from "@/lib/eventLoader";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";

export default function PresetSelector({ eventId, compact = false, positions = [] }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [expandedPresetId, setExpandedPresetId] = useState(null);
  const queryClient = useQueryClient();
  const { canEdit: isAdmin } = useUserRole();
  const { record } = useOperationLog(eventId);

  const { data: presets = [] } = useQuery({
    queryKey: ["positionPresets"],
    queryFn: () => base44.entities.PositionPreset.list(),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: positionTypes = [] } = useQuery({
    queryKey: ["positionTypes"],
    queryFn: () => base44.entities.PositionType.list(),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => loadEventById(eventId),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const activePreset = presets.find((p) => p.id === event?.active_preset_id);

  const slotToField = { "開場中": "required_count_before", "開演中": "required_count_during", "終演後": "required_count_after" };

  // 全時間帯一括適用
  const applyMutation = useMutation({
    mutationFn: async (preset) => {
      const response = await base44.functions.invoke("getPositionList", { eventId });
      const existing = response.positions || [];
      if (existing.length > 0) {
        await base44.functions.invoke("updatePositionSide", {
          action: "deletePositions",
          positionIds: existing.map((p) => p.id),
        });
      }
      const slotMap = preset.slot_positions || {};
      const positions = [];
      for (const slot of TIME_SLOTS) {
        const ids = slotMap[slot] || [];
        const field = slotToField[slot];
        for (let i = 0; i < ids.length; i++) {
          const pt = positionTypes.find((p) => p.id === ids[i]);
          if (pt) {
            positions.push({
              name: pt.name,
              color: pt.color || "#6366f1",
              time_slot: slot,
              staff_names: [],
              required_count: field ? (pt[field] ?? pt.required_count ?? 0) : 0,
              order: i,
            });
          }
        }
      }
      if (positions.length > 0) {
        await base44.functions.invoke("updatePositionSide", {
          action: "createPositions",
          eventId,
          positions,
        });
      }
      await base44.entities.Event.update(eventId, { active_preset_id: preset.id });
      return positions.length;
    },
    onSuccess: (created, preset) => {
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success(`プリセットを適用しました（${created}ポジション）`);
      setOpen(false);
      record({
        action_type: "preset_apply",
        description: `「${preset.name}」を全適用しました（${created}ポジション）`,
        entity_type: "PositionPreset",
        entity_id: preset.id,
      });
    },
    onError: (err) => {
      toast.error("プリセットの適用に失敗しました: " + (err?.message || "エラーが発生しました"));
    },
  });

  // 時間帯別個別適用（確認なし・即反映）
  const applySlotMutation = useMutation({
    mutationFn: async ({ preset, slot }) => {
      const response = await base44.functions.invoke("getPositionList", { eventId });
      const existing = response.positions || [];
      const slotExisting = existing.filter((p) => (p.time_slot || "開場中") === slot);
      if (slotExisting.length > 0) {
        await base44.functions.invoke("updatePositionSide", {
          action: "deletePositions",
          positionIds: slotExisting.map((p) => p.id),
        });
      }
      const ids = (preset.slot_positions || {})[slot] || [];
      const field = slotToField[slot];
      const positions = [];
      for (let i = 0; i < ids.length; i++) {
        const pt = positionTypes.find((p) => p.id === ids[i]);
        if (!pt) continue;
        positions.push({
          name: pt.name,
          color: pt.color || "#6366f1",
          time_slot: slot,
          staff_names: [],
          required_count: field ? (pt[field] ?? pt.required_count ?? 0) : 0,
          order: i,
        });
      }
      if (positions.length > 0) {
        await base44.functions.invoke("updatePositionSide", {
          action: "createPositions",
          eventId,
          positions,
        });
      }
      return positions.length;
    },
    onSuccess: (created, { preset, slot }) => {
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      toast.success(`${created}ポジションを適用しました`);
      record({
        action_type: "preset_apply",
        description: `「${preset.name}」の「${slot}」を適用しました（${created}ポジション）`,
        entity_type: "PositionPreset",
        entity_id: preset.id,
      });
    },
    onError: (err) => {
      toast.error("適用に失敗しました: " + (err?.message || "エラーが発生しました"));
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => base44.entities.Event.update(eventId, { active_preset_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      if (activePreset) {
        record({
          action_type: "preset_clear",
          description: `「${activePreset.name}」の適用を解除しました`,
          entity_type: "PositionPreset",
          entity_id: activePreset.id,
        });
      }
    },
  });

  if (!isAdmin) return null;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-border bg-card px-2 text-xs font-medium transition-colors hover:bg-muted/40"
        >
          <BookOpen className="w-3 h-3 text-primary" />
          {activePreset
            ? <span className="text-primary font-semibold max-w-[80px] truncate">{activePreset.name}</span>
            : <span className="text-muted-foreground">プリセット</span>}
          {open ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-8 z-50 w-56 border border-border rounded-xl bg-card shadow-lg overflow-hidden">
              {/* 現在の配置を保存 */}
              <div className="px-3 py-2 border-b border-border">
                <button
                  onClick={() => { setOpen(false); setShowSaveModal(true); }}
                  className="w-full flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <BookmarkPlus className="w-3 h-3" />現在の配置をプリセット保存
                </button>
              </div>
              {presets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">プリセットが登録されていません</p>
              ) : (
                <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
                  {presets.map((preset) => {
                    const isActive = event?.active_preset_id === preset.id;
                    const totalSlots = Object.values(preset.slot_positions || {}).flat().length;
                    const isExpanded = expandedPresetId === preset.id;
                    const isApplyingSlot = applySlotMutation.isPending;
                    return (
                      <div key={preset.id} className={`${isActive ? "bg-primary/5" : ""}`}>
                        {/* プリセット行 */}
                        <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors">
                          <button
                            onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="flex items-center gap-1">
                              <ChevronRight className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              <span className="text-xs font-semibold truncate">{preset.name}</span>
                              {isActive && <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">適用中</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground pl-4">計{totalSlots}ポジション</div>
                          </button>
                          {isActive ? (
                            <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 shrink-0"
                              disabled={clearMutation.isPending} onClick={() => setConfirm({ type: 'clear' })}>
                              解除
                            </Button>
                          ) : (
                            <Button size="sm" className="h-6 text-[11px] px-2 gap-1 shrink-0"
                              disabled={applyMutation.isPending} onClick={() => setConfirm({ type: 'apply', preset })}>
                              <Zap className="w-2.5 h-2.5" />全適用
                            </Button>
                          )}
                        </div>
                        {/* 時間帯別ボタン（展開時） */}
                        {isExpanded && (
                          <div className="px-3 pb-2 bg-muted/30 space-y-1">
                            <p className="text-[10px] text-muted-foreground pt-1 pb-0.5">時間帯別に適用：</p>
                            {TIME_SLOTS.map((slot) => {
                              const slotStyle = TIME_SLOT_STYLES[slot];
                              const count = ((preset.slot_positions || {})[slot] || []).length;
                              return (
                                <button
                                  key={slot}
                                  disabled={isApplyingSlot || count === 0}
                                  onClick={() => applySlotMutation.mutate({ preset, slot })}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${slotStyle.header} hover:opacity-80`}
                                >
                                  <span>{slot}</span>
                                  <span className="flex items-center gap-1">
                                    {count}件を適用
                                    <Zap className="w-2.5 h-2.5" />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {confirm?.type === 'apply' && (
          <ConfirmDialog message={`「${confirm.preset.name}」を適用しますか？\n現在のポジションは一度リセットされます。`}
            confirmLabel="適用" confirmVariant="default"
            onConfirm={() => { applyMutation.mutate(confirm.preset); setConfirm(null); }}
            onCancel={() => setConfirm(null)} />
        )}
        {confirm?.type === 'clear' && (
          <ConfirmDialog message="プリセットの適用を解除しますか？" confirmLabel="解除" confirmVariant="default"
            onConfirm={() => { clearMutation.mutate(); setConfirm(null); }}
            onCancel={() => setConfirm(null)} />
        )}
        {showSaveModal && (
          <SaveAsPresetModal
            positions={positions}
            positionTypes={positionTypes}
            eventId={eventId}
            onClose={() => setShowSaveModal(false)}
          />
        )}
      </div>
    );
  }

  // Full mode (original)
  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-xs font-medium">
        <span className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          {activePreset
            ? <span>適用中プリセット：<span className="text-primary font-semibold">{activePreset.name}</span></span>
            : <span className="text-muted-foreground">プリセットを選択して適用...</span>}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-1 border border-border rounded-xl bg-card shadow-sm overflow-hidden">
          {presets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">プリセットが登録されていません</p>
          ) : (
            <div className="divide-y divide-border">
              {presets.map((preset) => {
                const isActive = event?.active_preset_id === preset.id;
                const totalSlots = Object.values(preset.slot_positions || {}).flat().length;
                return (
                  <div key={preset.id} className={`flex items-center gap-3 px-3 py-2 ${isActive ? "bg-primary/5" : "hover:bg-muted/40"} transition-colors`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold">{preset.name}</span>
                        {isActive && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">適用中</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {preset.description ? `${preset.description}・` : ""}計{totalSlots}ポジション
                      </div>
                    </div>
                    {isActive ? (
                      <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 shrink-0"
                        disabled={clearMutation.isPending} onClick={() => setConfirm({ type: 'clear' })}>
                        {clearMutation.isPending ? "..." : "解除"}
                      </Button>
                    ) : (
                      <Button size="sm" className="h-6 text-[11px] px-2 gap-1 shrink-0"
                        disabled={applyMutation.isPending} onClick={() => setConfirm({ type: 'apply', preset })}>
                        <Zap className="w-2.5 h-2.5" />{applyMutation.isPending ? "適用中..." : "適用"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirm?.type === 'apply' && (
        <ConfirmDialog message={`「${confirm.preset.name}」を適用しますか？\n現在のポジションは一度リセットされます。`}
          confirmLabel="適用" confirmVariant="default"
          onConfirm={() => { applyMutation.mutate(confirm.preset); setConfirm(null); }}
          onCancel={() => setConfirm(null)} />
      )}
      {confirm?.type === 'clear' && (
        <ConfirmDialog message="プリセットの適用を解除しますか？" confirmLabel="解除" confirmVariant="default"
          onConfirm={() => { clearMutation.mutate(); setConfirm(null); }}
          onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}