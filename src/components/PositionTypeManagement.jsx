import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Settings, GripVertical } from "lucide-react";
import PositionPresetManager from "@/components/PositionPresetManager";
import { useUserRole } from "@/hooks/useUserRole";
import { useOperationLog } from "@/hooks/useOperationLog";
import { toast } from "sonner";
import { loadEventById } from "@/lib/eventLoader";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import {
  applyPositionSideSettingsToTypes,
  loadPositionSideSettings,
  rememberPositionSideSettings,
} from "@/lib/positionSideSettings";
import ConfirmDialog from "@/components/ConfirmDialog";
import SectionHeader from "@/components/SectionHeader";
import { useAllRoles } from "@/hooks/useAllRoles";
import CategoryPicker from "@/components/CategoryPicker";

const PRESET_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#06b6d4", "#f97316",
];

export default function PositionTypeManagement({ eventId, section = "positions" }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [category, setCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const queryClient = useQueryClient();
  const { canEdit: isAdmin } = useUserRole();
  const { record } = useOperationLog(eventId);
  const { allRoles, getBadgeClass } = useAllRoles();

  const { data: rawPositionTypes = [], isLoading } = useQuery({
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

  const positionTypes = applyPositionSideSettingsToTypes(rawPositionTypes);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => loadEventById(eventId),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke("updatePositionTypeRecord", { action: "create", data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["positionTypes"] });
      setName("");
      setColor(PRESET_COLORS[0]);
      setCategory("");
      const created = result?.data?.positionType || result?.positionType;
      record({
        action_type: "position_type_add",
        description: `ポジションタイプ「${created?.name || name.trim()}」を追加しました`,
        entity_type: "PositionType",
        entity_id: created?.id || "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }) => base44.functions.invoke("updatePositionTypeRecord", { action: "delete", id }),
    onSuccess: (_, { id, name: ptName }) => {
      queryClient.invalidateQueries({ queryKey: ["positionTypes"] });
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      record({
        action_type: "position_type_delete",
        description: `ポジションタイプ「${ptName}」を削除しました`,
        entity_type: "PositionType",
        entity_id: id,
      });
    },
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    const maxOrder = positionTypes.length > 0 ? Math.max(...positionTypes.map((p) => p.order ?? 0)) : -1;
    createMutation.mutate({
      name: name.trim(),
      color,
      category: category || "",
      required_count: 0,
      required_count_before: 0,
      required_count_during: 0,
      required_count_after: 0,
      order: maxOrder + 1,
    });
  };

  const handleToggleSplitBySide = async (positionType, splitBySide) => {
    const matchingPositions = (queryClient.getQueryData(["positions", eventId]) || [])
      .filter((position) => position.name === positionType.name);
    const matchingPositionIds = new Set(matchingPositions.map((p) => p.id));

    const positionMigrationMap = Object.fromEntries(
      matchingPositions.map((position) => {
        if (splitBySide) {
          return [position.id, {
            split_by_side: true,
            staff_names_kamite: position.staff_names || [],
            staff_names_shimote: [],
          }];
        } else {
          const merged = [...new Set([...(position.staff_names_kamite || []), ...(position.staff_names_shimote || [])])];
          return [position.id, {
            split_by_side: false,
            staff_names: merged,
            staff_names_kamite: [],
            staff_names_shimote: [],
          }];
        }
      })
    );

    // 楽観的UI更新: PositionType キャッシュを直接更新
    queryClient.setQueryData(["positionTypes"], (old = []) =>
      old.map((pt) => pt.id === positionType.id ? { ...pt, split_by_side: splitBySide } : pt)
    );

    const prevSideSettings = queryClient.getQueryData(["positionSideSettings", eventId]);
    const nextPositions = { ...(prevSideSettings?.positions || {}) };
    for (const [posId, migrationData] of Object.entries(positionMigrationMap)) {
      nextPositions[posId] = { ...(nextPositions[posId] || {}), ...migrationData };
    }
    const nextSideSettings = {
      position_types: {
        ...(prevSideSettings?.position_types || {}),
        [positionType.name]: splitBySide,
      },
      positions: nextPositions,
      updated_at: new Date().toISOString(),
    };
    queryClient.setQueryData(["positionSideSettings", eventId], nextSideSettings);
    queryClient.setQueryData(["positions", eventId], (old = []) =>
      old.map((position) => position.name === positionType.name
        ? { ...position, ...(positionMigrationMap[position.id] || {}) }
        : position)
    );

    try {
      // バックエンド経由で Position と MapTemplate を一括保存（chief ロールでも RLS が通る）
      await base44.functions.invoke("updatePositionSide", {
        action: "setSplitBySide",
        eventId,
        positionTypeId: positionType.id,
        positionTypeName: positionType.name,
        split_by_side: splitBySide,
        sideSettings: nextSideSettings,
      });

      rememberPositionSideSettings(eventId, nextSideSettings);
      queryClient.invalidateQueries({ queryKey: ["positionTypes"] });
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      record({
        action_type: "position_type_side_toggle",
        description: `「${positionType.name}」の上手/下手分割を${splitBySide ? "有効" : "無効"}にしました`,
        entity_type: "PositionType",
        entity_id: positionType.id,
      });
    } catch (err) {
      console.error("上手/下手設定の保存に失敗しました", err);
      // ロールバック
      queryClient.setQueryData(["positionSideSettings", eventId], prevSideSettings);
      queryClient.invalidateQueries({ queryKey: ["positionTypes"] });
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      queryClient.invalidateQueries({ queryKey: ["positionSideSettings", eventId] });
      toast.error("上手/下手設定の保存に失敗しました");
    }
  };

  const handleCategoryChange = (pt, nextCategory) => {
    queryClient.setQueryData(["positionTypes"], (old = []) =>
      old.map((p) => p.id === pt.id ? { ...p, category: nextCategory } : p)
    );
    base44.functions.invoke("updatePositionTypeRecord", { action: "update", data: { id: pt.id, category: nextCategory } });
  };

  const handleToggleRole = (pt, role) => {
    const current = pt.required_roles || [];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    queryClient.setQueryData(["positionTypes"], (old = []) =>
      old.map((p) => p.id === pt.id ? { ...p, required_roles: next } : p)
    );
    base44.functions.invoke("updatePositionTypeRecord", { action: "update", data: { id: pt.id, required_roles: next } });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); handleAdd(); }
  };

  const handleDragStart = (e, id) => { setDraggingId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (e, id) => { e.preventDefault(); if (id !== draggingId) setDragOverId(id); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return; }
    const fromIdx = positionTypes.findIndex((p) => p.id === draggingId);
    const toIdx = positionTypes.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { setDraggingId(null); setDragOverId(null); return; }
    const reordered = [...positionTypes];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    base44.functions.invoke("updatePositionTypeRecord", { action: "reorder", updates: reordered.map((pt, idx) => ({ id: pt.id, order: idx })) })
      .then(() => {
        record({
          action_type: "position_type_reorder",
          description: `ポジションタイプの順序を変更しました（「${moved.name}」を移動）`,
          entity_type: "PositionType",
        });
      });
    queryClient.setQueryData(["positionTypes"], reordered.map((pt, idx) => ({ ...pt, order: idx })));
    setDraggingId(null); setDragOverId(null);
  };

  return (
    <div>
      {section === "positions" && (
      <>
      {/* Position type section */}
      <SectionHeader
        icon={Settings}
        title="ポジション設定"
        subtitle="プリセット適用時に使用されるポジション一覧です。"
      />

      {/* Add form */}
      <div className="bg-card border border-border rounded-xl p-2.5 mb-2">
        <p className="text-[11px] font-medium mb-1.5 text-muted-foreground">ポジションを追加</p>
        <div className="space-y-1.5">
          <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="ポジション名（例：メイン受付A）" className="h-8 text-sm" />
          <CategoryPicker value={category} onChange={setCategory} />
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1 flex-1">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <Button onClick={handleAdd} disabled={!isAdmin || !name.trim() || createMutation.isPending} size="sm" className="gap-1 h-7 shrink-0">
              <Plus className="w-3 h-3" />追加
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-7 h-7 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : positionTypes.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Settings className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium">ポジションが登録されていません</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-2">
          {positionTypes.map((pt, idx) => (
            <div key={pt.id}
              className={`px-2.5 py-2 ${idx > 0 ? "border-t border-border/50" : ""} ${draggingId === pt.id ? "opacity-40" : ""} ${dragOverId === pt.id ? "ring-2 ring-inset ring-primary" : ""}`}
              onDragOver={(e) => handleDragOver(e, pt.id)}
              onDrop={(e) => handleDrop(e, pt.id)}
            >
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <div draggable onDragStart={(e) => handleDragStart(e, pt.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pt.color || "#6366f1" }} />
                <span className="font-medium text-xs flex-1 min-w-0 truncate">{pt.name}</span>
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(pt.split_by_side)}
                    onChange={(e) => handleToggleSplitBySide(pt, e.target.checked)}
                    disabled={!isAdmin}
                    className="w-3 h-3 accent-primary disabled:opacity-40"
                  />
                  上手/下手
                </label>
                <button onClick={() => setConfirmDelete({ id: pt.id, name: pt.name })} disabled={!isAdmin}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-5">
                <span className="text-[10px] text-muted-foreground mr-0.5">属性:</span>
                <div className="flex-1 min-w-0">
                  <CategoryPicker
                    value={pt.category || ""}
                    onChange={(v) => handleCategoryChange(pt, v)}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-5">
                <span className="text-[10px] text-muted-foreground mr-0.5">必要役割:</span>
                {allRoles.map((role) => {
                  const active = (pt.required_roles || []).includes(role.name);
                  return (
                    <button
                      key={role.name}
                      type="button"
                      onClick={() => isAdmin && handleToggleRole(pt, role.name)}
                      disabled={!isAdmin}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${active ? getBadgeClass(role.name) : "border-border text-muted-foreground"}`}
                    >
                      {active ? "" : "+"}{role.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog message={`「${confirmDelete.name}」を削除しますか？`} confirmLabel="削除"
          onConfirm={() => { deleteMutation.mutate({ id: confirmDelete.id, name: confirmDelete.name }); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)} />
      )}

      </>
      )}
      {section === "presets" && <PositionPresetManager eventId={eventId} />}
    </div>
  );
}