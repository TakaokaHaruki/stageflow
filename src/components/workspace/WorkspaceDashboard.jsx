import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Wand2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useLockedStaff } from "@/hooks/useLockedStaff";
import { useOperationLog } from "@/hooks/useOperationLog";
import { usePDFExport } from "@/hooks/usePDFExport";
import { TIME_SLOTS, TIME_SLOT_STYLES, CONTINUOUS_SLOT } from "@/lib/constants";
import { loadEventById } from "@/lib/eventLoader";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import {
  applyPositionSideSettingsToPositions,
  applyPositionSideSettingsToTypes,
  loadPositionSideSettings,
  applyPositionSideMutation,
  rememberPositionSideSettings,
} from "@/lib/positionSideSettings";
import StaffPool from "./StaffPool";
import PositionGrid from "./PositionGrid";
import ContextPanel from "./ContextPanel";

export default function WorkspaceDashboard({ eventId }) {
  const queryClient = useQueryClient();
  const { canEdit, role } = useUserRole();
  const { record } = useOperationLog(eventId);
  const isAdmin = canEdit;

  const [activeSlot, setActiveSlot] = useState("開場中");
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [skillFilter, setSkillFilter] = useState(null);
  const [draggedStaff, setDraggedStaff] = useState(null);

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

  const { lockedNames, isLocked, toggleLock } = useLockedStaff(eventId, event ?? null);

  const continuousMode = Boolean(event?.continuous_mode);
  const positionTypes = applyPositionSideSettingsToTypes(rawPositionTypes, sideSettings);
  const positions = applyPositionSideSettingsToPositions(rawPositions, positionTypes, sideSettings);

  const { exporting: exportingPDF, exportPDF: handleExportPDF } = usePDFExport(eventId, "staff", "配置表");

  const allSkills = useMemo(() => {
    const set = new Set();
    staffList.forEach((s) => (s.skills || []).forEach((sk) => set.add(sk)));
    return [...set].sort();
  }, [staffList]);

  const updatePositionMutation = useMutation({
    scope: { id: `workspace-position-${eventId}` },
    mutationFn: async ({ positionId, data }) => {
      const response = await base44.functions.invoke("updatePositionSide", {
        action: "updatePositionStaff",
        eventId,
        positionId,
        ...data,
      });
      const payload = unwrapFunctionResponse(response);
      if (payload?.error) throw new Error(payload.error);
      return payload;
    },
    onMutate: async ({ positionId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["positions", eventId] });
      const previousPositions = queryClient.getQueryData(["positions", eventId]);
      queryClient.setQueryData(["positions", eventId], (old) =>
        (old || []).map((p) => (p.id === positionId ? { ...p, ...data } : p))
      );
      return { previousPositions };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["positions", eventId], context?.previousPositions);
    },
    onSuccess: (result, vars, context) => {
      if (result?.sideSettings) {
        queryClient.setQueryData(["positionSideSettings", eventId], rememberPositionSideSettings(eventId, result.sideSettings));
      }
      if (context?._logEntry) {
        record(context._logEntry);
      }
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
    },
  });

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
      },
    });
  }, [positions, staffList, continuousMode, updatePositionMutation, record]);

  const removeStaffFromPosition = useCallback((positionId, staffName) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;
    updatePositionMutation.mutate({
      positionId,
      data: {
        staff_names: (position.staff_names || []).filter((n) => n !== staffName),
        split_by_side: Boolean(position.split_by_side),
        staff_names_kamite: (position.staff_names_kamite || []).filter((n) => n !== staffName),
        staff_names_shimote: (position.staff_names_shimote || []).filter((n) => n !== staffName),
      },
    });
  }, [positions, updatePositionMutation]);

  const toggleStaffFlag = useCallback((staffId, field, value) => {
    queryClient.setQueryData(["staff", eventId], (old = []) =>
      old.map((item) => (item.id === staffId ? { ...item, [field]: value } : item))
    );
    base44.functions.invoke("updateStaffRecord", { action: "update", staffId, data: { [field]: value } }).catch(() => {});
  }, [eventId, queryClient]);

  const handleStaffDragStart = (e, staffName) => {
    setDraggedStaff(staffName);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleStaffDragEnd = () => setDraggedStaff(null);

  const handleDropOnPosition = (e, positionId, side = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedStaff) return;
    assignStaffToPosition(draggedStaff, positionId, side);
    setDraggedStaff(null);
  };

  const allAssignedNames = new Set(positions.flatMap((p) => [
    ...(p.staff_names || []),
    ...(p.staff_names_kamite || []),
    ...(p.staff_names_shimote || []),
  ]));

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || null;
  const selectedPosition = positions.find((p) => p.id === selectedPositionId) || null;

  const slots = continuousMode ? [CONTINUOUS_SLOT] : TIME_SLOTS;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1 py-1.5 border-b border-border bg-card/60">
        <div className="flex items-center gap-1">
          {slots.map((slot) => (
            <button
              key={slot}
              onClick={() => setActiveSlot(slot)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeSlot === slot
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={handleExportPDF} disabled={exportingPDF || positions.length === 0}>
            <Download className="w-3 h-3" />{exportingPDF ? "..." : "PDF"}
          </Button>
        </div>
      </div>

      {/* 3-pane layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-1 overflow-hidden">
        {/* Left: Staff Pool */}
        <div className="hidden lg:block border border-border rounded-lg bg-card overflow-hidden">
          <StaffPool
            staffList={staffList}
            allAssignedNames={allAssignedNames}
            allSkills={allSkills}
            skillFilter={skillFilter}
            onSkillFilterChange={setSkillFilter}
            selectedStaffId={selectedStaffId}
            onSelectStaff={setSelectedStaffId}
            onDragStart={handleStaffDragStart}
            onDragEnd={handleStaffDragEnd}
            draggedStaff={draggedStaff}
            onToggleFlag={toggleStaffFlag}
            isLocked={isLocked}
            onToggleLock={toggleLock}
            isAdmin={isAdmin}
            continuousMode={continuousMode}
          />
        </div>

        {/* Center: Position Grid */}
        <div className="border border-border rounded-lg bg-card overflow-y-auto scrollbar-hide">
          <PositionGrid
            positions={positions}
            activeSlot={activeSlot}
            continuousMode={continuousMode}
            staffList={staffList}
            isAdmin={isAdmin}
            draggedStaff={draggedStaff}
            onDropOnPosition={handleDropOnPosition}
            onStaffDragStart={handleStaffDragStart}
            onStaffDragEnd={handleStaffDragEnd}
            onStaffRemove={removeStaffFromPosition}
            onSelectPosition={setSelectedPositionId}
            selectedPositionId={selectedPositionId}
            lockedNames={lockedNames}
          />
        </div>

        {/* Right: Context Panel */}
        <div className="hidden lg:block border border-border rounded-lg bg-card overflow-hidden">
          <ContextPanel
            selectedStaff={selectedStaff}
            selectedPosition={selectedPosition}
            staffList={staffList}
            positions={positions}
            isAdmin={isAdmin}
            onRemoveStaff={removeStaffFromPosition}
            onClearSelection={() => { setSelectedStaffId(null); setSelectedPositionId(null); }}
          />
        </div>
      </div>

      {/* Mobile fallback message */}
      <div className="lg:hidden flex items-center justify-center h-full p-4 text-center">
        <p className="text-sm text-muted-foreground">
          ワークスペースビューはPC・タブレット（横幅1024px以上）でご利用ください。
        </p>
      </div>
    </div>
  );
}