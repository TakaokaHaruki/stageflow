import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Users, AlertCircle, Pencil, UserCog, Download, Bug } from "lucide-react";
import StaffScrapeModal from "@/components/StaffScrapeModal";
import StaffCsvImportModal from "@/components/StaffCsvImportModal";
import StaffEditModal from "@/components/StaffEditModal";
import { TIME_SLOT_STYLES } from "@/lib/constants";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { getStaffDisplayName } from "@/lib/staffName";

import { loadEventById } from "@/lib/eventLoader";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { useOperationLog } from "@/hooks/useOperationLog";
import { useStaffHistoryBadges } from "@/hooks/useStaffHistoryBadges";
import { useAllRoles } from "@/hooks/useAllRoles";
import RoleIcon from "@/components/RoleIcon";
import SectionHeader from "@/components/SectionHeader";

export default function StaffManagement({ eventId }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [editingStaff, setEditingStaff] = useState(null);
  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();
  const { canEdit, canManageSettings, role } = useUserRole();
  const shouldMaskStaffNames = role !== "admin" && role !== "chief";
  const { record } = useOperationLog(eventId);
  const { badges: historyBadges, isLoading: isLoadingBadges, isFetching: isFetchingBadges } = useStaffHistoryBadges(eventId);
  const { getBadgeClass } = useAllRoles();


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
      await base44.functions.invoke("updateStaffRecord", { action: "delete", staffId: id });
      if (staffToDelete) {
        const affected = positions.filter((p) => (p.staff_names || []).includes(staffToDelete.name));
        await Promise.all(
          affected.map((p) =>
            base44.functions.invoke("updatePositionSide", {
              action: "updatePositionStaff",
              eventId,
              positionId: p.id,
              staff_names: p.staff_names.filter((n) => n !== staffToDelete.name),
              split_by_side: Boolean(p.split_by_side),
              staff_names_kamite: (p.staff_names_kamite || []).filter((n) => n !== staffToDelete.name),
              staff_names_shimote: (p.staff_names_shimote || []).filter((n) => n !== staffToDelete.name),
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
      const staffToDelete = (previousStaff || staffList).find((s) => s.id === id);
      queryClient.setQueryData(["staff", eventId], (old = []) => old.filter((staff) => staff.id !== id));
      if (staffToDelete) {
        queryClient.setQueryData(["positions", eventId], (old = []) =>
          old.map((position) => ({
            ...position,
            staff_names: (position.staff_names || []).filter((name) => name !== staffToDelete.name),
          }))
        );
      }
      return { previousStaff, previousPositions, staffToDelete };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["staff", eventId], context?.previousStaff);
      queryClient.setQueryData(["positions", eventId], context?.previousPositions);
      toast.error("スタッフの削除に失敗しました");
    },
    onSuccess: (_, id, context) => {
      const staffToDelete = context?.staffToDelete;
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
      queryClient.invalidateQueries({ queryKey: ["staff", eventId] });
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
    }
  });

  const handleAdd = () => {
    if (!canEdit || !name.trim()) return;
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

  return (
    <div>
      <SectionHeader
        icon={UserCog}
        title="スタッフ管理"
        subtitle={
          <span className="flex items-center gap-1.5">
            <span>登録スタッフ数：{staffList.length}名</span>
            {isLoadingBadges && (
              <span className="flex items-center gap-0.5 text-primary">
                <span className="inline-block w-2.5 h-2.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                傾向取得中
              </span>
            )}
          </span>
        }
        actions={(
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs shrink-0 border-amber-400/50 text-amber-600 hover:bg-amber-500/10"
              onClick={() => canEdit && setShowCsvImport(true)}
              disabled={!canEdit}
              title="CSV一括登録（デバッグ機能）"
            >
              <Bug className="w-3 h-3" />CSV登録
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs shrink-0"
              onClick={() => canEdit && setShowScrapeModal(true)}
              disabled={!canEdit}
            >
              <Download className="w-3 h-3" />点呼表から取得
            </Button>
          </div>
        )}
      />

      {/* Add form */}
      <div className="bg-card border border-border rounded-lg p-1 mb-1.5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5 sm:flex">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="スタッフ名"
            disabled={!canEdit}
            className="col-span-2 h-9 min-w-0 flex-1 text-sm sm:col-span-1 sm:h-8" />
          
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="備考"
            disabled={!canEdit}
            className="h-9 min-w-0 text-sm sm:h-8 sm:w-24" />
          
          <Button onClick={handleAdd} disabled={!canEdit || !name.trim() || createMutation.isPending} size="sm" className="gap-0.5 shrink-0">
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

      <div className="grid grid-cols-2 gap-1">
          {staffList.map((staff) => {
          const assigned = assignedMap[staff.name] || [];
          const displayName = getStaffDisplayName(staff.name, shouldMaskStaffNames);
          const unassigned = assigned.length === 0;
          return (
            <div key={staff.id} className={`bg-card border border-border rounded-lg px-2.5 py-1.5 ${unassigned ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                    {displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="font-medium text-xs" style={{ color: staff.color || undefined }}>{displayName}</p>
                      {staff.note && <span className="text-[10px] text-muted-foreground">({staff.note})</span>}
                      {(staff.roles || []).map((role) => (
                        <span key={role} className={`inline-flex items-center gap-0.5 text-[10px] px-1 rounded border font-medium ${getBadgeClass(role)}`}>
                          <RoleIcon role={role} />
                          {role}
                        </span>
                      ))}
                      {staff.costume_change && <span className="text-[10px] px-1 rounded bg-purple-100 border border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300 font-medium">着替</span>}
                      {staff.break && <span className="text-[10px] px-1 rounded bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-300 font-medium">休憩</span>}
                      {(staff.skills || []).map((skill) => (
                        <span key={skill} className="text-[10px] px-1 rounded bg-primary/10 border border-primary/30 text-primary font-medium">{skill}</span>
                      ))}
                    </div>
                    {isLoadingBadges ? (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className="inline-block w-2.5 h-2.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-[9px] text-muted-foreground">取得中</span>
                      </div>
                    ) : historyBadges[staff.name] && Object.keys(historyBadges[staff.name]).length > 0 ? (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {SLOT_ORDER.filter((slot) => historyBadges[staff.name][slot]).map((slot) => {
                          const shortSlot = slot.replace(/中|後$/, "");
                          return (
                            <span key={slot} className="text-[9px] font-medium px-1 rounded border bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-700/40 dark:border-gray-600 dark:text-gray-400">
                              {shortSlot}：{historyBadges[staff.name][slot]}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[9px] text-muted-foreground/60 italic mt-0.5">配置傾向が分析できませんでした</p>
                    )}
                    {(staff.note_before || staff.note_during || staff.note_after) && (
                      <div className="flex flex-wrap gap-x-2 gap-y-0">
                        {staff.note_before && <span className="text-[10px] text-muted-foreground">開場: {staff.note_before}</span>}
                        {staff.note_during && <span className="text-[10px] text-muted-foreground">開演: {staff.note_during}</span>}
                        {staff.note_after && <span className="text-[10px] text-muted-foreground">終演: {staff.note_after}</span>}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {unassigned && <span className="flex items-center gap-0.5 text-[10px] text-amber-700 dark:text-amber-300"><AlertCircle className="w-2.5 h-2.5" />未配置</span>}
                      {assigned.map((a, i) =>
                        <span key={i} className={`text-[10px] font-semibold px-1 rounded border ${TIME_SLOT_STYLES[a.slot]?.badge || "bg-slate-100 border-slate-200 text-slate-700"}`}>
                          {a.slot.replace(/中|後$/, "")}：{a.posName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => canEdit && setEditingStaff(staff)} disabled={!canEdit} className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none sm:h-6 sm:w-6" title="編集" aria-label={`${displayName}を編集`}>
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => canEdit && setConfirmDelete({ id: staff.id, name: staff.name })} disabled={!canEdit} className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none sm:h-6 sm:w-6" title="削除" aria-label={`${displayName}を削除`}>
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

      {showCsvImport &&
      <StaffCsvImportModal eventId={eventId} onClose={() => setShowCsvImport(false)} onImported={() => queryClient.invalidateQueries({ queryKey: ["staff", eventId] })} />
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
    </div>);

}