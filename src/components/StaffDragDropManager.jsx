import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, ClipboardList, Plus, Download, Users, GripVertical, Trash2, Wand2, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import PositionCard from "@/components/PositionCard";
import PositionBulkAddModal from "@/components/PositionBulkAddModal";
import PositionFormModal from "@/components/PositionFormModal";
import StaffEditModal from "@/components/StaffEditModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { usePDFExport } from "@/hooks/usePDFExport";
import { TIME_SLOTS, TIME_SLOT_STYLES } from "@/lib/constants";
import { getStaffDisplayName } from "@/lib/staffName";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import { loadEventById } from "@/lib/eventLoader";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { useOperationLog } from "@/hooks/useOperationLog";
import { useLockedStaff } from "@/hooks/useLockedStaff";
import {
  applyPositionSideMutation,
  applyPositionSideSettingsToPositions,
  applyPositionSideSettingsToTypes,
  loadPositionSideSettings,
  rememberPositionSideSettings,
} from "@/lib/positionSideSettings";
import PresetSelector from "@/components/PresetSelector";
import { HiddenInEditMode, ModeLoadingPlaceholder, ModeVisibilityControls, useResolvedEventMode } from "@/components/ModeVisibilityControls";
import AutoAssignModal from "@/components/AutoAssignModal";
import BulkDeleteDialog from "@/components/BulkDeleteDialog";
import SectionHeader from "@/components/SectionHeader";

export default function StaffDragDropManager({ eventId }) {
  const queryClient = useQueryClient();
  const { canEdit, canManageSettings, role } = useUserRole();
  const { record } = useOperationLog(eventId);
  const [mobileSlot, setMobileSlot] = useState(TIME_SLOTS[0]);

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getStaffList", { eventId });
      return res?.data?.staff ?? [];
    },
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: rawPositions = [] } = useQuery({
    queryKey: ["positions", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPositionList", { eventId });
      return res?.data?.positions ?? [];
    },
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => loadEventById(eventId),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { lockedNames, isLocked, toggleLock, clearAllLocks } = useLockedStaff(eventId, event ?? null);

  const { data: presets = [] } = useQuery({
    queryKey: ["positionPresets"],
    queryFn: () => base44.entities.PositionPreset.list(),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: rawPositionTypes = [] } = useQuery({
    queryKey: ["positionTypes"],
    queryFn: () => base44.entities.PositionType.list(),
    select: (d) => [...d].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: sideSettings } = useQuery({
    queryKey: ["positionSideSettings", eventId],
    queryFn: () => loadPositionSideSettings(base44, eventId),
    staleTime: 30_000,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const positionTypes = applyPositionSideSettingsToTypes(rawPositionTypes, sideSettings);
  const positions = applyPositionSideSettingsToPositions(rawPositions, positionTypes, sideSettings);

  const updatePositionMutation = useMutation({
    scope: { id: `position-side-${eventId}` },
    mutationFn: async ({ positionId, data, _logEntry: _ignored }) => {
      if (
        Object.prototype.hasOwnProperty.call(data, "staff_names") ||
        Object.prototype.hasOwnProperty.call(data, "staff_names_kamite") ||
        Object.prototype.hasOwnProperty.call(data, "staff_names_shimote") ||
        Object.prototype.hasOwnProperty.call(data, "split_by_side")
      ) {
        const response = await base44.functions.invoke("updatePositionSide", {
          action: "updatePositionStaff",
          eventId,
          positionId,
          ...data,
        });
        const payload = unwrapFunctionResponse(response);
        if (payload?.error) throw new Error(payload.error);
        return payload;
      }
      // staff 系フィールドを含まない更新は updatePositionFields アクションを使用
      const staffFields = ['staff_names', 'staff_names_kamite', 'staff_names_shimote', 'split_by_side'];
      const hasStaffFields = Object.keys(data).some((key) => staffFields.includes(key));
      if (hasStaffFields) {
        const response = await base44.functions.invoke("updatePositionSide", {
          action: "updatePositionStaff",
          eventId,
          positionId,
          ...data,
        });
        const payload = unwrapFunctionResponse(response);
        if (payload?.error) throw new Error(payload.error);
        return payload;
      }
      const response = await base44.functions.invoke("updatePositionSide", {
        action: "updatePositionFields",
        positionId,
        data,
      });
      const payload = unwrapFunctionResponse(response);
      if (payload?.error) throw new Error(payload.error);
      return payload;
    },
    onMutate: async ({ positionId, data, _logEntry }) => {
      await queryClient.cancelQueries({ queryKey: ["positions", eventId] });
      await queryClient.cancelQueries({ queryKey: ["positionSideSettings", eventId] });
      const previousPositions = queryClient.getQueryData(["positions", eventId]);
      const previousSideSettings = queryClient.getQueryData(["positionSideSettings", eventId]);
      queryClient.setQueryData(["positions", eventId], (old) =>
        (old || []).map((p) => (p.id === positionId ? { ...p, ...data } : p))
      );
      if (
        Object.prototype.hasOwnProperty.call(data, "staff_names_kamite") ||
        Object.prototype.hasOwnProperty.call(data, "staff_names_shimote") ||
        Object.prototype.hasOwnProperty.call(data, "split_by_side")
      ) {
        queryClient.setQueryData(["positionSideSettings", eventId], (old) =>
          applyPositionSideMutation(old, positionId, data)
        );
      }
      return { previousPositions, previousSideSettings, _logEntry };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(["positions", eventId], context?.previousPositions);
      queryClient.setQueryData(["positionSideSettings", eventId], context?.previousSideSettings);
    },
    onSuccess: (result, _vars, context) => {
      if (result?.sideSettings) {
        queryClient.setQueryData(["positionSideSettings", eventId], rememberPositionSideSettings(eventId, result.sideSettings));
      }
      if (context?._logEntry) {
        record(context._logEntry);
      }
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
    },
  });

  const { exporting: exportingPDF, exportPDF: handleExportPDF } = usePDFExport(eventId, "staff", "配置表");

  const [draggedStaff, setDraggedStaff] = useState(null);
  const [draggingPosId, setDraggingPosId] = useState(null);
  const [dragOverPosId, setDragOverPosId] = useState(null);
  const autoScrollFrameRef = useRef(null);
  const dragPointRef = useRef(null);
  const autoScrollActiveRef = useRef(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [defaultSlot, setDefaultSlot] = useState("開場中");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(null); // slot name
  const [showAutoAssign, setShowAutoAssign] = useState(false);

  const stopAutoScroll = useCallback(() => {
    autoScrollActiveRef.current = false;
    dragPointRef.current = null;
    if (autoScrollFrameRef.current) {
      cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const isDragging = Boolean(draggedStaff || draggingPosId);
    if (!canEdit || !isDragging) {
      stopAutoScroll();
      return undefined;
    }

    autoScrollActiveRef.current = true;
    const edgeSize = 96;
    const maxSpeed = 24;

    const getVelocity = (point, size) => {
      if (point < edgeSize) return -Math.ceil(((edgeSize - point) / edgeSize) * maxSpeed);
      if (point > size - edgeSize) return Math.ceil(((point - (size - edgeSize)) / edgeSize) * maxSpeed);
      return 0;
    };

    const step = () => {
      autoScrollFrameRef.current = null;
      if (!autoScrollActiveRef.current || !dragPointRef.current) return;

      const { x, y } = dragPointRef.current;
      const top = getVelocity(y, window.innerHeight);
      const left = getVelocity(x, window.innerWidth);
      if (top || left) {
        window.scrollBy({ top, left, behavior: "auto" });
        autoScrollFrameRef.current = requestAnimationFrame(step);
      }
    };

    const handleWindowDragOver = (e) => {
      dragPointRef.current = { x: e.clientX, y: e.clientY };
      if (!autoScrollFrameRef.current) {
        autoScrollFrameRef.current = requestAnimationFrame(step);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", stopAutoScroll);
    window.addEventListener("dragend", stopAutoScroll);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", stopAutoScroll);
      window.removeEventListener("dragend", stopAutoScroll);
      stopAutoScroll();
    };
  }, [draggedStaff, draggingPosId, canEdit, stopAutoScroll]);

  // 一括削除: スタッフのみクリア
  const handleBulkClearStaff = async (slot) => {
    const slotPositions = positions.filter((p) => (p.time_slot || "開場中") === slot);
    await Promise.all(slotPositions.map((p) =>
      base44.functions.invoke("updatePositionSide", {
        action: "updatePositionStaff",
        eventId,
        positionId: p.id,
        staff_names: [],
        split_by_side: Boolean(p.split_by_side),
        staff_names_kamite: [],
        staff_names_shimote: [],
      })
    ));
    queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
    setConfirmBulkDelete(null);
  };

  // 一括削除: ポジションごと全削除
  const handleBulkDeletePositions = async (slot) => {
    const slotPositions = positions.filter((p) => (p.time_slot || "開場中") === slot);
    await base44.functions.invoke("updatePositionSide", {
      action: "deletePositions",
      positionIds: slotPositions.map((p) => p.id),
    });
    queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
    record({
      action_type: "position_delete",
      description: `「${slot}」のポジション${slotPositions.length}件を一括削除しました`,
      entity_type: "Position",
    });
    setConfirmBulkDelete(null);
  };


  const deleteMutation = useMutation({
    mutationFn: async ({ id }) => {
      await base44.functions.invoke("updatePositionSide", { action: "deletePosition", positionId: id });
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["positions", eventId] });
      const prev = queryClient.getQueryData(["positions", eventId]);
      const posToDelete = prev?.find((p) => p.id === id);
      queryClient.setQueryData(["positions", eventId], (old) => old.filter((p) => p.id !== id));
      return { previousPositions: prev, posToDelete };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(["positions", eventId], context.previousPositions);
    },
    onSuccess: (_, { id }, context) => {
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      const pos = context?.posToDelete;
      if (pos) {
        record({
          action_type: "position_delete",
          description: `「${pos.name}」(${pos.time_slot || "開場中"})を削除しました`,
          entity_type: "Position",
          entity_id: id,
          snapshot_before: pos,
        });
      }
    },
  });

  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const openAdd = (slot) => { setDefaultSlot(slot); setShowBulkAddModal(true); };

  const handleStaffDragStart = (e, staffName) => {
    setDraggedStaff(staffName);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleStaffDragEnd = () => {
    setDraggedStaff(null);
    stopAutoScroll();
  };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const assignStaffToPosition = useCallback((staffName, positionId, side = null) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;
    const effectiveSide = position.split_by_side ? (side || "kamite") : null;
    const currentStaffNames = position.staff_names || [];
    const kamite = position.staff_names_kamite || [];
    const shimote = position.staff_names_shimote || [];
    if (currentStaffNames.includes(staffName) && (!position.split_by_side || !effectiveSide)) return;
    const slot = position.time_slot || "開場中";
    const alreadyInSlot = positions.some(
      (p) => p.id !== positionId && (p.time_slot || "開場中") === slot && (p.staff_names || []).includes(staffName)
    );
    if (alreadyInSlot) return;
    const nextKamite = effectiveSide === "kamite" ? [...new Set([...kamite, staffName])] : kamite.filter((n) => n !== staffName);
    const nextShimote = effectiveSide === "shimote" ? [...new Set([...shimote, staffName])] : shimote.filter((n) => n !== staffName);
    const nextStaffNames = position.split_by_side
      ? [...new Set([...nextKamite, ...nextShimote])]
      : [...new Set([...currentStaffNames, staffName])];
    updatePositionMutation.mutate({
      positionId,
      data: {
        staff_names: nextStaffNames,
        ...(position.split_by_side ? { split_by_side: true, staff_names_kamite: nextKamite, staff_names_shimote: nextShimote } : {}),
      },
      _logEntry: {
        action_type: "position_assign",
        description: `「${staffName}」を「${position.name}」(${slot})に配置しました`,
        entity_type: "Position",
        entity_id: positionId,
        snapshot_before: { staff_names: currentStaffNames, staff_names_kamite: kamite, staff_names_shimote: shimote, split_by_side: position.split_by_side || false },
        snapshot_after: { staff_names: nextStaffNames },
      },
    });
  }, [positions, updatePositionMutation, record]);

  const handleDropOnPosition = (e, positionId) => {
    e.preventDefault();
    if (!draggedStaff) return;
    assignStaffToPosition(draggedStaff, positionId);
    setDraggedStaff(null);
  };

  const handleDropOnPositionSide = (e, positionId, side) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedStaff) return;
    assignStaffToPosition(draggedStaff, positionId, side);
    setDraggedStaff(null);
  };

  const handleDropUnassigned = (e) => { e.preventDefault(); setDraggedStaff(null); };

  const removeStaffFromPosition = (positionId, staffName) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;
    const slot = position.time_slot || "開場中";
    updatePositionMutation.mutate({
      positionId,
      data: {
        staff_names: (position.staff_names || []).filter((n) => n !== staffName),
        split_by_side: Boolean(position.split_by_side),
        staff_names_kamite: (position.staff_names_kamite || []).filter((n) => n !== staffName),
        staff_names_shimote: (position.staff_names_shimote || []).filter((n) => n !== staffName),
      },
      _logEntry: {
        action_type: "position_unassign",
        description: `「${staffName}」を「${position.name}」(${slot})から解除しました`,
        entity_type: "Position",
        entity_id: positionId,
        snapshot_before: { staff_names: position.staff_names || [], staff_names_kamite: position.staff_names_kamite || [], staff_names_shimote: position.staff_names_shimote || [], split_by_side: position.split_by_side || false },
        snapshot_after: { staff_names: (position.staff_names || []).filter((n) => n !== staffName) },
      },
    });
  };

  // Position reorder - also sync to active preset
  const syncOrderToPreset = (slot, reorderedPositions) => {
    if (!event?.active_preset_id) return;
    const activePreset = presets.find((p) => p.id === event.active_preset_id);
    if (!activePreset) return;
    const currentSlotPositions = activePreset.slot_positions || {};
    // Map position names to positionType ids in new order
    const { data: positionTypes } = queryClient.getQueryState(["positionTypes"]) || {};
    if (!positionTypes) return;
    const newSlotIds = reorderedPositions.map((pos) => {
      const pt = positionTypes.find((t) => t.name === pos.name);
      return pt?.id;
    }).filter(Boolean);
    if (newSlotIds.length > 0) {
      base44.functions.invoke("updatePositionPresetRecord", {
        action: "update",
        id: event.active_preset_id,
        data: { slot_positions: { ...currentSlotPositions, [slot]: newSlotIds } },
      });
      queryClient.setQueryData(["positionPresets"], (old) =>
        (old || []).map((p) =>
          p.id === event.active_preset_id
            ? { ...p, slot_positions: { ...(p.slot_positions || {}), [slot]: newSlotIds } }
            : p
        )
      );
    }
  };

  const handlePosDragStart = (e, posId) => { setDraggingPosId(posId); e.dataTransfer.effectAllowed = "move"; };
  const handlePosDragEnd = () => { setDraggingPosId(null); setDragOverPosId(null); stopAutoScroll(); };
  const handlePosDragOver = (e, posId) => { e.preventDefault(); if (posId !== draggingPosId) setDragOverPosId(posId); };
  const handlePosDrop = (e, slot, targetPosId) => {
    e.preventDefault();
    if (!draggingPosId || draggingPosId === targetPosId) { setDraggingPosId(null); setDragOverPosId(null); return; }
    const slotPositions = positions.filter((p) => (p.time_slot || "開場中") === slot)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const fromIdx = slotPositions.findIndex((p) => p.id === draggingPosId);
    const toIdx = slotPositions.findIndex((p) => p.id === targetPosId);
    if (fromIdx === -1 || toIdx === -1) { setDraggingPosId(null); setDragOverPosId(null); return; }
    const reordered = [...slotPositions];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const updates = reordered.map((pos, idx) => ({ positionId: pos.id, data: { order: idx } }));
    Promise.all(updates.map((u) => base44.functions.invoke("updatePositionSide", { action: "updatePositionFields", ...u })));
    queryClient.setQueryData(["positions", eventId], (old) => {
      const others = old.filter((p) => (p.time_slot || "開場中") !== slot);
      return [...others, ...reordered.map((pos, idx) => ({ ...pos, order: idx }))];
    });
    syncOrderToPreset(slot, reordered);
    setDraggingPosId(null); setDragOverPosId(null);
  };

  const grouped = TIME_SLOTS.reduce((acc, slot) => {
    acc[slot] = positions.filter((p) => (p.time_slot || "開場中") === slot)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return acc;
  }, {});

  const unassigned = staffList
    .map((staff) => {
      const missingSlots = TIME_SLOTS.filter((slot) =>
        !positions.some((p) => (p.time_slot || "開場中") === slot && (p.staff_names || []).includes(staff.name))
      );
      return { ...staff, missingSlots };
    })
    .filter((staff) => staff.missingSlots.length > 0);
  const { mode: assignmentMode, isReady: isModeReady } = useResolvedEventMode(eventId, "assignment_mode", event?.assignment_mode);
  const isPublicMode = assignmentMode === "public";
  const hideForUser = !isPublicMode && !canEdit;
  const isVisibilityReady = Boolean(role) && isModeReady;
  const isAdmin = canEdit && !isPublicMode;
  const shouldMaskStaffNames = role !== "admin" && role !== "chief";

  return (
    <div>
      <SectionHeader
        icon={ClipboardList}
        title="配置表"
        actions={(
          <>
          <ModeVisibilityControls
            eventId={eventId}
            field="assignment_mode"
            mode={assignmentMode}
            canManage={canManageSettings}
            label="配置表"
          />
          {canManageSettings && <PresetSelector eventId={eventId} compact positions={positions} />}
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs px-2 shrink-0" onClick={() => setShowAutoAssign(true)} disabled={positions.length === 0}>
              <Wand2 className="w-3 h-3" />自動配置
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs px-2 shrink-0" onClick={handleExportPDF} disabled={!isVisibilityReady || hideForUser || exportingPDF || positions.length === 0}>
            <Download className="w-3 h-3" />{exportingPDF ? '...' : 'PDF'}
          </Button>
          </>
        )}
      />

      {!isVisibilityReady ? (
        <ModeLoadingPlaceholder />
      ) : hideForUser ? (
        <HiddenInEditMode title="配置表は編集モード中です" />
      ) : (
        <>

      <div className="mb-1.5 grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/40 p-0.5 sm:hidden">
        {TIME_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setMobileSlot(slot)}
            className={`min-h-9 rounded-md px-1 text-xs font-semibold transition-colors ${
              mobileSlot === slot ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            }`}
            aria-pressed={mobileSlot === slot}
          >
            {slot}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {TIME_SLOTS.map((slot) => {
          const style = TIME_SLOT_STYLES[slot];
          const slotPositions = grouped[slot];
          const slotRequiredCount = slotPositions.reduce((sum, p) => sum + (p.required_count ?? 0), 0);
          const slotAssignedStaffNames = new Set(slotPositions.flatMap((p) => p.staff_names || []));
          const slotAssignedCount = staffList.filter((s) => slotAssignedStaffNames.has(s.name)).length;
          const slotBorderClass = slot === "開場中" ? "border-amber-400 dark:border-amber-500" : slot === "開演中" ? "border-blue-400 dark:border-blue-500" : "border-slate-400 dark:border-slate-400";
          return (
            <div key={slot} className={`${mobileSlot === slot ? "block" : "hidden"} border-2 rounded-lg overflow-hidden sm:block ${slotBorderClass}`}>
              <div className={`flex items-center justify-between px-2 py-1 ${style.header}`}>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs">{slot}</span>
                  <span className="text-[10px] opacity-70">{slotPositions.length}件</span>
                  <span className="text-[10px] opacity-70">設定：{slotRequiredCount}名</span>
                  <span className="text-[10px] opacity-70 flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />配置：{slotAssignedCount}名</span>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">

                    <button onClick={() => openAdd(slot)}
                      title="ポジションを追加"
                      className="flex min-h-8 items-center gap-1 rounded bg-white/60 px-1.5 text-[11px] font-medium text-current transition-colors hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/20 sm:min-h-0 sm:py-0.5 sm:text-[10px] select-none">
                      <Plus className="w-2.5 h-2.5" />追加
                    </button>
                    {slotPositions.length > 0 && (
                      <button onClick={() => setConfirmBulkDelete(slot)}
                        title="このスロットを一括削除"
                        className="flex min-h-8 items-center gap-1 rounded bg-red-500/20 px-1.5 text-[11px] font-medium text-red-800 transition-colors hover:bg-red-500/40 dark:text-red-200 sm:min-h-0 sm:py-0.5 sm:text-[10px] select-none">
                        <Trash2 className="w-2.5 h-2.5" />一括削除
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-card p-1">
                {slotPositions.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-1.5">ポジションがありません</p>
                ) : (
                  <div className="grid gap-0.5">
                    {slotPositions.map((pos) => (
                      <div key={pos.id}
                        data-pos-id={pos.id}
                        className={`flex items-start gap-1 ${draggingPosId === pos.id ? "opacity-40" : ""} ${dragOverPosId === pos.id ? "ring-2 ring-primary rounded-lg" : ""}`}
                        onDragOver={(e) => handlePosDragOver(e, pos.id)}
                        onDrop={(e) => handlePosDrop(e, slot, pos.id)}
                      >
                        {isAdmin && (
                          <div draggable
                            onDragStart={(e) => handlePosDragStart(e, pos.id)}
                            onDragEnd={handlePosDragEnd}
                            className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5 shrink-0">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <PositionCard
                            pos={pos}
                            isAdmin={isAdmin}
                            draggable={true}
                            draggedStaff={draggedStaff}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnPosition(e, pos.id)}
                            onDropSide={(e, side) => handleDropOnPositionSide(e, pos.id, side)}
                            onStaffDragStart={(e, name, posId) => {
                              handleStaffDragStart(e, name);
                              removeStaffFromPosition(posId, name);
                            }}
                            onStaffDragEnd={handleStaffDragEnd}
                            onStaffRemove={removeStaffFromPosition}
                            onStaffEdit={(staff) => setEditingStaff(staff)}
                            onEdit={(p) => { setEditing(p); setShowModal(true); }}
                            onDelete={(id) => setConfirmDelete({ id, name: pos.name })}
                            emptyLabel="スタッフをドラッグして配置"
                            staffList={staffList}
                            requiredCount={pos.required_count ?? 0}
                            onRequiredCountChange={(v) => {
                              queryClient.setQueryData(["positions", eventId], (old) =>
                                old.map((p) => p.id === pos.id ? { ...p, required_count: v } : p)
                              );
                              base44.functions.invoke("updatePositionSide", {
                                action: "updatePositionFields",
                                positionId: pos.id,
                                data: { required_count: v },
                              });
                            }}
                            occupiedInSlot={[...new Set(
                              slotPositions.filter((p) => p.id !== pos.id).flatMap((p) => p.staff_names || [])
                            )]}
                            maskStaffNames={shouldMaskStaffNames}
                            onToggleLock={isAdmin ? toggleLock : undefined}
                            lockedNames={lockedNames}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="mt-1.5 border border-amber-300 dark:border-amber-700 rounded-lg overflow-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-3 h-3" />
            <span className="font-bold text-xs">未配置スタッフ</span>
            <span className="text-[10px] opacity-70">{unassigned.length}名</span>
          </div>
          <div className="bg-card p-1 grid gap-0.5 min-h-[28px] sm:grid-cols-3" onDragOver={isAdmin ? handleDragOver : undefined} onDrop={isAdmin ? handleDropUnassigned : undefined}>
            {unassigned.map((s) => {
              const displayName = getStaffDisplayName(s.name, shouldMaskStaffNames);
              return (
              <div key={s.id} draggable={isAdmin}
                onDragStart={isAdmin ? (e) => handleStaffDragStart(e, s.name) : undefined}
                onDragEnd={isAdmin ? handleStaffDragEnd : undefined}
                className={`flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 ${isAdmin ? "cursor-move hover:bg-amber-100 dark:hover:bg-amber-900/50" : "cursor-default"} ${draggedStaff === s.name ? "opacity-50" : ""}`}>
                <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{displayName}</span>
                  {s.note && <span className="text-[10px] text-muted-foreground">({s.note})</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {s.missingSlots.map((slot) => (
                    <span key={slot} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${TIME_SLOT_STYLES[slot].header}`}>
                      {slot}未配置
                    </span>
                  ))}
                </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-1.5 border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted border-b border-border">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="font-bold text-xs">スタッフ一覧</span>
          <span className="text-[10px] text-muted-foreground">{staffList.length}名</span>
        </div>
        <div className="bg-card sm:grid sm:grid-cols-3 divide-y divide-border">
          {staffList.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">スタッフが登録されていません</p>
          ) : (
            staffList.map((s) => {
              const displayName = getStaffDisplayName(s.name, shouldMaskStaffNames);
              const nameColor = s.color || undefined;
              const slotAssignments = TIME_SLOTS.map((slot) => ({
                slot,
                positions: positions.filter((p) => (p.time_slot || "開場中") === slot && (p.staff_names || []).includes(s.name)),
              })).filter((sa) => sa.positions.length > 0);
              return (
                <div key={s.id} className="flex items-start gap-2 px-2 py-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 mt-0.5">
                    {displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium" style={{ color: nameColor }}>{displayName}</p>
                      {s.note && <span className="text-[10px] text-muted-foreground">({s.note})</span>}
                    </div>
                    {(s.note_before || s.note_during || s.note_after) && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {s.note_before && <span className="text-[10px] text-muted-foreground">開場中: {s.note_before}</span>}
                        {s.note_during && <span className="text-[10px] text-muted-foreground">開演中: {s.note_during}</span>}
                        {s.note_after && <span className="text-[10px] text-muted-foreground">終演後: {s.note_after}</span>}
                      </div>
                    )}
                    {slotAssignments.length === 0 ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" />全スロット未配置</span>
                    ) : (
                      <div className="mt-0.5 grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {slotAssignments.map(({ slot, positions: ps }) =>
                          ps.map((p) => (
                            <span key={p.id} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium text-center truncate ${TIME_SLOT_STYLES[slot].header}`}>
                              {slot}：{p.name}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <button
                          onClick={() => toggleLock(s.name)}
                          className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded border transition-colors ${isLocked(s.name) ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300" : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"}`}
                          title={isLocked(s.name) ? "ロック解除" : "ロック（自動配置から除外）"}
                        >
                          {isLocked(s.name) ? <Lock className="w-2.5 h-2.5" /> : <LockOpen className="w-2.5 h-2.5" />}
                          {isLocked(s.name) ? "固定中" : "固定"}
                        </button>
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!s.costume_change}
                            onChange={(e) => {
                              const val = e.target.checked;
                              queryClient.setQueryData(["staff", eventId], (old = []) =>
                                old.map((item) => item.id === s.id ? { ...item, costume_change: val } : item)
                              );
                              base44.functions.invoke("updateStaffRecord", { action: "update", staffId: s.id, data: { costume_change: val } });
                            }}
                            className="w-3 h-3 accent-purple-600"
                          />
                          <span className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">着替</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!!s.break}
                            onChange={(e) => {
                              const val = e.target.checked;
                              queryClient.setQueryData(["staff", eventId], (old = []) =>
                                old.map((item) => item.id === s.id ? { ...item, break: val } : item)
                              );
                              base44.functions.invoke("updateStaffRecord", { action: "update", staffId: s.id, data: { break: val } });
                            }}
                            className="w-3 h-3 accent-sky-600"
                          />
                          <span className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">休憩</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showBulkAddModal && (
        <PositionBulkAddModal eventId={eventId} defaultTimeSlot={defaultSlot}
          onClose={() => setShowBulkAddModal(false)}
          onSaved={(added) => {
            queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
            const count = Array.isArray(added) ? added.length : 1;
            record({
              action_type: "position_add",
              description: `「${defaultSlot}」に${count}件のポジションを一括追加しました`,
              entity_type: "Position",
            });
          }} />
      )}
      {showModal && (
        <PositionFormModal position={editing} eventId={eventId} defaultTimeSlot={defaultSlot}
          onClose={() => setShowModal(false)}
          onSaved={(saved) => {
            queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
            if (!editing) {
              record({
                action_type: "position_add",
                description: `「${saved?.name || "不明"}」(${saved?.time_slot || defaultSlot})を追加しました`,
                entity_type: "Position",
                entity_id: saved?.id || "",
              });
            }
          }} />
      )}
      {editingStaff && (
        <StaffEditModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSaved={() => {}}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog message={`「${confirmDelete.name}」を削除しますか？`} confirmLabel="削除"
          onConfirm={() => { deleteMutation.mutate({ id: confirmDelete.id }); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)} />
      )}
      {confirmBulkDelete && (
        <BulkDeleteDialog
          slot={confirmBulkDelete}
          count={grouped[confirmBulkDelete]?.length ?? 0}
          onClearStaff={() => handleBulkClearStaff(confirmBulkDelete)}
          onDeletePositions={() => handleBulkDeletePositions(confirmBulkDelete)}
          onCancel={() => setConfirmBulkDelete(null)}
        />
      )}
      {showAutoAssign && (
        <AutoAssignModal
          positions={positions}
          staffList={staffList}
          lockedNames={lockedNames}
          onClearLocks={clearAllLocks}
          onCancel={() => setShowAutoAssign(false)}
          onConfirm={async (plan) => {
            setShowAutoAssign(false);
            await Promise.all(
              Object.entries(plan).map(([positionId, newStaff]) => {
                const pos = positions.find((p) => p.id === positionId);
                if (!pos) return Promise.resolve();
                const merged = [...new Set([...(pos.staff_names || []), ...newStaff])];
                return updatePositionMutation.mutateAsync({
                  positionId,
                  data: {
                    staff_names: merged,
                    split_by_side: Boolean(pos.split_by_side),
                    staff_names_kamite: pos.staff_names_kamite || [],
                    staff_names_shimote: pos.staff_names_shimote || [],
                  },
                });
              })
            );
            queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
          }}
        />
      )}
        </>
      )}
    </div>
  );
}
