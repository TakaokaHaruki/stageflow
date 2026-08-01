import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, ClipboardList, Plus, Download, Users, Trash2, Wand2, Lock, LockOpen, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import PositionCard from "@/components/PositionCard";
import PositionBulkAddModal from "@/components/PositionBulkAddModal";
import PositionFormModal from "@/components/PositionFormModal";
import StaffEditModal from "@/components/StaffEditModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { usePDFExport } from "@/hooks/usePDFExport";
import { TIME_SLOTS, TIME_SLOT_STYLES, CONTINUOUS_SLOT } from "@/lib/constants";
import { getStaffDisplayName } from "@/lib/staffName";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import { loadEventById } from "@/lib/eventLoader";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { useOperationLog } from "@/hooks/useOperationLog";
import { useLockedStaff } from "@/hooks/useLockedStaff";
import RoleIcon from "@/components/RoleIcon";
import {
  applyPositionSideMutation,
  applyPositionSideSettingsToPositions,
  applyPositionSideSettingsToTypes,
  loadPositionSideSettings,
  rememberPositionSideSettings,
} from "@/lib/positionSideSettings";
import PresetSelector from "@/components/PresetSelector";
import AutoAssignModal from "@/components/AutoAssignModal";
import BulkDeleteDialog from "@/components/BulkDeleteDialog";
import SectionHeader from "@/components/SectionHeader";

export default function StaffDragDropManager({ eventId }) {
  const queryClient = useQueryClient();
  const { canEdit, canManageSettings, role } = useUserRole();
  const { record } = useOperationLog(eventId);
  const [mobileSlot, setMobileSlot] = useState(null);

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

  const continuousMode = Boolean(event?.continuous_mode);
  const activeSlots = continuousMode ? [CONTINUOUS_SLOT] : TIME_SLOTS;
  const currentMobileSlot = mobileSlot ?? activeSlots[0];
  useEffect(() => {
    if (!continuousMode) {
      setMobileSlot((prev) => prev && !TIME_SLOTS.includes(prev) ? "開場中" : prev);
    } else {
      setMobileSlot(CONTINUOUS_SLOT);
    }
  }, [continuousMode]);

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
      }).catch(() => {})
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
  const openAdd = (slot) => { setDefaultSlot(continuousMode ? CONTINUOUS_SLOT : slot); setShowBulkAddModal(true); };

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
    const staff = staffList.find((s) => s.name === staffName);
    const isSectionChief = (staff?.roles || []).includes("セクションチーフ");
    const skipDupCheck = continuousMode && isSectionChief;
    const alreadyInSlot = !skipDupCheck && positions.some(
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
  }, [positions, staffList, continuousMode, updatePositionMutation, record]);

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
      }).catch(() => {});
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
    Promise.all(updates.map((u) => base44.functions.invoke("updatePositionSide", { action: "updatePositionFields", ...u })))
      .then(() => {
        record({
          action_type: "position_reorder",
          description: `「${slot}」のポジション順序を変更しました（「${moved.name}」を移動）`,
          entity_type: "Position",
        });
      })
      .catch(() => {});
    queryClient.setQueryData(["positions", eventId], (old) => {
      const others = old.filter((p) => (p.time_slot || "開場中") !== slot);
      return [...others, ...reordered.map((pos, idx) => ({ ...pos, order: idx }))];
    });
    syncOrderToPreset(slot, reordered);
    setDraggingPosId(null); setDragOverPosId(null);
  };

  const grouped = activeSlots.reduce((acc, slot) => {
    acc[slot] = (continuousMode ? positions : positions.filter((p) => (p.time_slot || "開場中") === slot))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return acc;
  }, {});

  const allAssignedNames = new Set(positions.flatMap((p) => [
    ...(p.staff_names || []),
    ...(p.staff_names_kamite || []),
    ...(p.staff_names_shimote || []),
  ]));
  const unassigned = continuousMode
    ? staffList.filter((s) => !allAssignedNames.has(s.name)).map((s) => ({ ...s, missingSlots: [] }))
    : staffList
        .map((staff) => {
          const missingSlots = TIME_SLOTS.filter((slot) =>
            !positions.some((p) => {
              if ((p.time_slot || "開場中") !== slot) return false;
              return (p.staff_names || []).includes(staff.name) ||
                (p.staff_names_kamite || []).includes(staff.name) ||
                (p.staff_names_shimote || []).includes(staff.name);
            })
          );
          return { ...staff, missingSlots };
        })
        .filter((staff) => staff.missingSlots.length > 0);
  const isAdmin = canEdit;
  const shouldMaskStaffNames = role !== "admin" && role !== "chief";

  return (
    <div>
      <SectionHeader
        icon={ClipboardList}
        title="配置表"
        description={continuousMode ? "一日通しモードです　各セクションチーフがスタッフを追加することができます" : undefined}
        actions={(
          <>
          {canManageSettings && <PresetSelector eventId={eventId} compact positions={positions} />}
          {canEdit && (
            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs px-2 shrink-0" onClick={() => setShowAutoAssign(true)} disabled={positions.length === 0}>
              <Wand2 className="w-3 h-3" />自動配置
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1 h-8 text-xs px-2 shrink-0" onClick={handleExportPDF} disabled={exportingPDF || positions.length === 0}>
            <Download className="w-3 h-3" />{exportingPDF ? '...' : 'PDF'}
          </Button>
          </>
        )}
      />

      <div className={`mb-1.5 ${continuousMode ? "grid-cols-2" : "grid-cols-4"} grid gap-1 rounded-lg border border-border bg-muted/40 p-0.5 sm:hidden`}>
        {activeSlots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setMobileSlot(slot)}
            className={`min-h-9 rounded-md px-1 text-xs font-semibold transition-colors ${
              currentMobileSlot === slot ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
            }`}
            aria-pressed={currentMobileSlot === slot}
          >
            {slot}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMobileSlot("未配置")}
          className={`min-h-9 rounded-md px-1 text-xs font-semibold transition-colors ${
            currentMobileSlot === "未配置" ? "bg-amber-500 text-white shadow-sm" : "text-amber-600 dark:text-amber-400"
          }`}
          aria-pressed={currentMobileSlot === "未配置"}
        >
          未配置
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
        {activeSlots.map((slot) => {
          const style = TIME_SLOT_STYLES[slot];
          const slotPositions = grouped[slot];
          const slotAssignedStaffNames = new Set(slotPositions.flatMap((p) => p.staff_names || []));
          const slotAssignedCount = staffList.filter((s) => slotAssignedStaffNames.has(s.name)).length;
          const slotBorderClass = slot === "開場中" ? "border-amber-400 dark:border-amber-500" : slot === "開演中" ? "border-blue-400 dark:border-blue-500" : slot === "通し" ? "border-emerald-400 dark:border-emerald-500" : "border-slate-400 dark:border-slate-400";
          return (
            <div key={slot} className={`${currentMobileSlot === slot ? "block" : "hidden"} border-2 rounded-lg overflow-hidden sm:block ${continuousMode ? "sm:col-span-2" : ""} ${slotBorderClass}`}>
              <div className={`flex items-center justify-between px-2 py-1 ${style.header}`}>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs">{slot}</span>
                  <span className="text-[10px] opacity-70 flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />配置：{slotAssignedCount}/{staffList.length}名</span>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex min-h-8 items-center gap-0.5 rounded bg-white/60 px-1.5 text-[11px] font-medium text-current transition-colors hover:bg-white/90 dark:bg-white/10 dark:hover:bg-white/20 sm:min-h-0 sm:py-0.5 sm:text-[10px] select-none">
                        編集<ChevronDown className="w-2.5 h-2.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[7rem]">
                      <DropdownMenuItem onClick={() => openAdd(slot)}>
                        <Plus className="w-3 h-3" />追加
                      </DropdownMenuItem>
                      {slotPositions.length > 0 && (
                        <DropdownMenuItem onClick={() => setConfirmBulkDelete(slot)} className="text-destructive focus:text-destructive">
                          <Trash2 className="w-3 h-3" />一括削除
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                        className={`${draggingPosId === pos.id ? "opacity-40" : ""} ${dragOverPosId === pos.id ? "ring-2 ring-primary rounded-lg" : ""}`}
                        onDragOver={(e) => handlePosDragOver(e, pos.id)}
                        onDrop={(e) => handlePosDrop(e, slot, pos.id)}
                      >
                        <PositionCard
                          pos={pos}
                          eventId={eventId}
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
                          onStaffEdit={(staff, pos) => setEditingStaff({ staff, pos })}
                          onEdit={(p) => { setEditing(p); setShowModal(true); }}
                          emptyLabel="スタッフを配置にドラッグ"
                          staffList={staffList}
                          requiredCount={pos.required_count ?? 0}
                          onRequiredCountChange={(v) => {
                            const prevCount = pos.required_count ?? 0;
                            queryClient.setQueryData(["positions", eventId], (old) =>
                              old.map((p) => p.id === pos.id ? { ...p, required_count: v } : p)
                            );
                            base44.functions.invoke("updatePositionSide", {
                              action: "updatePositionFields",
                              positionId: pos.id,
                              data: { required_count: v },
                            }).then(() => {
                              record({
                                action_type: "event_update",
                                description: `「${pos.name}」の必要人数を${prevCount}名→${v}名に変更しました`,
                                entity_type: "Position",
                                entity_id: pos.id,
                                snapshot_before: { required_count: prevCount },
                                snapshot_after: { required_count: v },
                              });
                            }).catch(() => {});
                          }}
                          occupiedInSlot={[...new Set(
                            slotPositions.filter((p) => p.id !== pos.id).flatMap((p) => p.staff_names || [])
                          )]}
                          maskStaffNames={shouldMaskStaffNames}
                          onToggleLock={isAdmin ? toggleLock : undefined}
                          lockedNames={lockedNames}
                          onPosDragStart={isAdmin ? (e) => handlePosDragStart(e, pos.id) : undefined}
                          onPosDragEnd={isAdmin ? handlePosDragEnd : undefined}
                          continuousMode={continuousMode}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* 未配置列 */}
        <div className={`${currentMobileSlot === "未配置" ? "block" : "hidden"} border-2 rounded-lg overflow-hidden sm:block ${continuousMode ? "sm:col-span-2" : ""} border-amber-400 dark:border-amber-500`}>
          <div className="flex items-center justify-between px-2 py-1 bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs">未配置</span>
              <span className="text-[10px] opacity-70">{unassigned.length}名</span>
            </div>
          </div>
          <div className="bg-card p-1" onDragOver={isAdmin ? handleDragOver : undefined} onDrop={isAdmin ? handleDropUnassigned : undefined}>
            {unassigned.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-1.5">未配置スタッフはいません</p>
            ) : (
              <div className={`grid gap-0.5 ${continuousMode ? "grid-cols-2" : ""}`}>
                {unassigned.map((s) => {
                  const displayName = getStaffDisplayName(s.name, shouldMaskStaffNames);
                  return (
                  <div key={s.id} draggable={isAdmin}
                    onDragStart={isAdmin ? (e) => handleStaffDragStart(e, s.name) : undefined}
                    onDragEnd={isAdmin ? handleStaffDragEnd : undefined}
                    className={`flex min-h-8 items-center justify-between gap-1.5 px-2 py-0.5 select-none bg-card border border-border rounded ${isAdmin ? "cursor-move hover:bg-muted/50" : "cursor-default"} ${draggedStaff === s.name ? "opacity-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{displayName}</span>
                      {(s.roles || []).map((role) => (
                        <RoleIcon key={role} role={role} />
                      ))}
                      {s.note && <span className="text-[10px] text-muted-foreground">({s.note})</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(s.skills || []).map((skill) => (
                        <span key={skill} className="text-[10px] px-1 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">{skill}</span>
                      ))}
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
            )}
          </div>
        </div>
      </div>

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
                positions: positions.filter((p) => (p.time_slot || "開場中") === slot && (
                (p.staff_names || []).includes(s.name) ||
                (p.staff_names_kamite || []).includes(s.name) ||
                (p.staff_names_shimote || []).includes(s.name)
              )),
              })).filter((sa) => sa.positions.length > 0);
              return (
                <div key={s.id} className="flex items-start gap-2 px-2 py-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 mt-0.5">
                    {displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-medium" style={{ color: nameColor }}>{displayName}</p>
                      {(s.roles || []).map((role) => (
                        <RoleIcon key={role} role={role} />
                      ))}
                      {(s.skills || []).map((skill) => (
                        <span key={skill} className="text-[10px] px-1 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">{skill}</span>
                      ))}
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
                              base44.functions.invoke("updateStaffRecord", { action: "update", staffId: s.id, data: { costume_change: val } }).catch(() => {});
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
                              base44.functions.invoke("updateStaffRecord", { action: "update", staffId: s.id, data: { break: val } }).catch(() => {});
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
        <PositionBulkAddModal eventId={eventId} defaultTimeSlot={defaultSlot} continuousMode={continuousMode}
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
        <PositionFormModal position={editing} eventId={eventId} defaultTimeSlot={defaultSlot} continuousMode={continuousMode}
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
          staff={editingStaff.staff}
          pos={editingStaff.pos}
          isLocked={isLocked(editingStaff.staff.name)}
          onToggleLock={isAdmin ? toggleLock : undefined}
          onRemoveFromPosition={editingStaff.pos ? (posId, name) => {
            removeStaffFromPosition(posId, name);
            setEditingStaff(null);
          } : undefined}
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
    </div>
  );
}