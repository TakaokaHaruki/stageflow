import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users, AlertCircle, Pencil, UserCog, Download } from "lucide-react";
import StaffScrapeModal from "@/components/StaffScrapeModal";
import StaffEditModal from "@/components/StaffEditModal";
import { TIME_SLOT_STYLES } from "@/lib/constants";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { getStaffDisplayName } from "@/lib/staffName";

import { loadEventById } from "@/lib/eventLoader";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { HiddenInEditMode, ModeLoadingPlaceholder, ModeVisibilityControls, useResolvedEventMode } from "@/components/ModeVisibilityControls";
import { useOperationLog } from "@/hooks/useOperationLog";

export default function StaffManagement({ eventId }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [editingStaff, setEditingStaff] = useState(null);
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();
  const { canEdit, canManageSettings, role } = useUserRole();
  const shouldMaskStaffNames = role !== "admin" && role !== "chief";
  const { record } = useOperationLog(eventId);


  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["staff", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getStaffList", { eventId });
      return res?.data?.staff ?? [];
    },
    refetchInterval: (query) => {
      // Suppress background refetch while a create mutation is in flight
      // to prevent overwriting optimistic updates
      if (query.state.fetchStatus === "fetching") return false;
      return LIVE_SYNC_INTERVAL;
    },
  });

  const { data: positions = [] } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke("updateStaffRecord", { action: "create", data });
      return res?.data?.staff;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["staff", eventId] });
      const previousStaff = queryClient.getQueryData(["staff", eventId]);
      const optimisticId = `temp-staff-${Date.now()}`;
      queryClient.setQueryData(["staff", eventId], (old = []) => [...old, { ...data, id: optimisticId }]);
      setName("");
      setNote("");
      return { previousStaff, optimisticId };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["staff", eventId], context?.previousStaff);
      toast.error("スタッフの追加に失敗しました");
    },
    onSuccess: (createdStaff, variables, context) => {
      if (createdStaff?.id) {
        queryClient.setQueryData(["staff", eventId], (old = []) =>
          old.map((staff) => staff.id === context?.optimisticId ? createdStaff : staff)
        );
        record({
          action_type: "staff_add",
          description: `スタッフ「${variables.name}」を追加しました`,
          entity_type: "Staff",
          entity_id: createdStaff.id,
          snapshot_before: {},
          snapshot_after: createdStaff,
        });
        // Delay invalidation to avoid overwriting concurrent optimistic updates
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["staff", eventId] });
        }, 3000);
      } else {
        queryClient.invalidateQueries({ queryKey: ["staff", eventId] });
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const staffToDelete = staffList.find((s) => s.id === id);
      if (staffToDelete) {
        record({
          action_type: "staff_delete",
          description: `スタッフ「${staffToDelete.name}」を削除しました`,
          entity_type: "Staff",
          entity_id: id,
          snapshot_before: { ...staffToDelete, event_id: eventId },
          snapshot_after: {},
        });
      }
      await base44.functions.invoke("updateStaffRecord", { action: "delete", staffId: id });
      if (staffToDelete) {
        const affected = positions.filter((p) => (p.staff_names || []).includes(staffToDelete.name));
        await Promise.all(
          affected.map((p) =>
          base44.entities.Position.update(p.id, {
            staff_names: p.staff_names.filter((n) => n !== staffToDelete.name)
          })
          )
        );
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["staff", eventId] });
      await queryClient.cancelQueries({ queryKey: ["positions", eventId] });
      const previousStaff = queryClient.getQueryData(["staff", eventId]);
      const previousPositions = queryClient.getQueryData(["positions", eventId]);
      const staffToDelete = staffList.find((s) => s.id === id);
      queryClient.setQueryData(["staff", eventId], (old = []) => old.filter((staff) => staff.id !== id));
      if (staffToDelete) {
        queryClient.setQueryData(["positions", eventId], (old = []) =>
          old.map((position) => ({
            ...position,
            staff_names: (position.staff_names || []).filter((name) => name !== staffToDelete.name),
          }))
        );
      }
      return { previousStaff, previousPositions };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["staff", eventId], context?.previousStaff);
      queryClient.setQueryData(["positions", eventId], context?.previousPositions);
      toast.error("スタッフの削除に失敗しました");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", eventId] });
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
    }
  });

  const handleAdd = () => {
    if (!canUseEditTools || !name.trim()) return;
    createMutation.mutate({ event_id: eventId, name: name.trim(), note: note.trim() });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {e.preventDefault();handleAdd();}
  };

  // Build map: staffName -> assigned positions (sorted by slot order)
  const SLOT_ORDER = ["開場中", "開演中", "終演後"];
  const assignedMap = {};
  positions.forEach((pos) => {
    (pos.staff_names || []).forEach((sName) => {
      if (!assignedMap[sName]) assignedMap[sName] = [];
      assignedMap[sName].push({ posName: pos.name || pos.role, slot: pos.time_slot || "開場中" });
    });
  });
  // Sort each staff's assignments by slot order
  Object.keys(assignedMap).forEach((name) => {
    assignedMap[name].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  });

  const { mode: staffManagementMode, isReady: isModeReady } = useResolvedEventMode(eventId, "staff_management_mode", event?.staff_management_mode);
  const isEditMode = staffManagementMode === "edit";
  const hideForUser = !canEdit && staffManagementMode !== "public";
  const isVisibilityReady = Boolean(role) && isModeReady && Boolean(event);
  const canUseEditTools = canEdit;

  return (
    <div>
      <div className="flex flex-col gap-1.5 mb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold flex items-center gap-1.5"><UserCog className="w-4 h-4 text-primary" />スタッフ管理</h2>
          {isVisibilityReady && !hideForUser && (
            <div className="text-xs font-medium text-foreground mt-0.5">登録スタッフ数：{staffList.length}名</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 justify-end flex-wrap sm:flex-nowrap sm:ml-auto">
          <ModeVisibilityControls
            eventId={eventId}
            field="staff_management_mode"
            mode={staffManagementMode}
            canManage={canManageSettings}
            label="スタッフ管理"
          />
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-8 text-xs px-2 shrink-0"
            onClick={() => canUseEditTools && setShowScrapeModal(true)}
            disabled={!canUseEditTools}
          >
            <Download className="w-3 h-3" />点呼表から取得
          </Button>
        </div>
      </div>

      {!isVisibilityReady ? (
        <ModeLoadingPlaceholder />
      ) : hideForUser ? (
        <HiddenInEditMode title="スタッフ管理は編集モード中です" />
      ) : (
        <>

      {/* Add form */}
      <div className="bg-card border border-border rounded-lg p-1 mb-1.5">
        <div className="flex gap-1.5">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="スタッフ名"
            disabled={!canUseEditTools}
            className="flex-1 h-8 text-sm" />
          
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備考"
            disabled={!canUseEditTools}
            className="w-24 h-8 text-sm" />
          
          <Button onClick={handleAdd} disabled={!canUseEditTools || !name.trim() || createMutation.isPending} size="sm" className="gap-0.5 h-8 px-2 shrink-0">
            <Plus className="w-3 h-3" />追加
          </Button>
        </div>
      </div>

      {/* Staff list */}
      {isLoading ?
      <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div> :
      staffList.length === 0 ?
      <div className="text-center py-14 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium">スタッフが登録されていません</p>
        </div> :

      <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
          {staffList.map((staff) => {
          const assigned = assignedMap[staff.name] || [];
          const displayName = getStaffDisplayName(staff.name, shouldMaskStaffNames);
          const unassigned = assigned.length === 0;
          return (
            <div key={staff.id} className={`bg-card px-2.5 py-1.5 ${unassigned ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                    {displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="font-medium text-xs" style={{ color: staff.color || undefined }}>{displayName}</p>
                      {staff.note && <span className="text-[10px] text-muted-foreground">({staff.note})</span>}
                      {staff.costume_change && <span className="text-[10px] px-1 rounded bg-purple-100 border border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300 font-medium">着替</span>}
                      {staff.break && <span className="text-[10px] px-1 rounded bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-300 font-medium">休憩</span>}
                      {(staff.skills || []).map((skill) => (
                        <span key={skill} className="text-[10px] px-1 rounded bg-primary/10 border border-primary/30 text-primary font-medium">{skill}</span>
                      ))}
                    </div>
                    {(staff.note_before || staff.note_during || staff.note_after) && (
                      <div className="flex flex-wrap gap-x-2 gap-y-0">
                        {staff.note_before && <span className="text-[10px] text-muted-foreground">開場中: {staff.note_before}</span>}
                        {staff.note_during && <span className="text-[10px] text-muted-foreground">開演中: {staff.note_during}</span>}
                        {staff.note_after && <span className="text-[10px] text-muted-foreground">終演後: {staff.note_after}</span>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {unassigned && <span className="flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-300"><AlertCircle className="w-2.5 h-2.5" />未配置</span>}
                      {assigned.map((a, i) =>
                        <span key={i} className={`text-[10px] font-semibold px-1 rounded border ${TIME_SLOT_STYLES[a.slot]?.badge || "bg-slate-100 border-slate-200 text-slate-700"}`}>
                          {a.slot}：{a.posName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => canUseEditTools && setEditingStaff(staff)} disabled={!canUseEditTools} className="p-1 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none" title="編集">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => canUseEditTools && setConfirmDelete({ id: staff.id, name: staff.name })} disabled={!canUseEditTools} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none" title="削除">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>);
        })}
        </div>
      }

      {showScrapeModal &&
      <StaffScrapeModal eventId={eventId} onClose={() => setShowScrapeModal(false)} />
      }

      {editingStaff &&
      <StaffEditModal
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
        onSaved={() => {}} />
      }

      {confirmDelete && (
        <ConfirmDialog
          message={`「${confirmDelete.name}」を削除しますか？`}
          confirmLabel="削除"
          onConfirm={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
        </>
      )}
    </div>);

}