import { X } from "lucide-react";
import { getStaffDisplayName } from "@/lib/staffName";
import RoleIcon from "@/components/RoleIcon";
import { TIME_SLOT_STYLES } from "@/lib/constants";

export default function PositionGrid({
  positions,
  activeSlot,
  continuousMode,
  staffList,
  isAdmin,
  draggedStaff,
  onDropOnPosition,
  onStaffDragStart,
  onStaffDragEnd,
  onStaffRemove,
  onSelectPosition,
  selectedPositionId,
  lockedNames,
}) {
  const slotPositions = (continuousMode ? positions : positions.filter((p) => (p.time_slot || "開場中") === activeSlot))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  if (slotPositions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-sm text-muted-foreground">この時間帯のポジションがありません</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-1.5">
        {slotPositions.map((pos) => {
          const splitBySide = Boolean(pos.split_by_side);
          const kamite = pos.staff_names_kamite || [];
          const shimote = pos.staff_names_shimote || [];
          const allNames = splitBySide ? [...new Set([...kamite, ...shimote])] : (pos.staff_names || []);
          const requiredCount = pos.required_count ?? 0;
          const diff = requiredCount > 0 ? requiredCount - allNames.length : null;
          const isShort = diff !== null && diff > 0;
          const isFull = diff !== null && diff <= 0;
          const isSelected = selectedPositionId === pos.id;

          return (
            <div
              key={pos.id}
              onClick={() => onSelectPosition(pos.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => onDropOnPosition(e, pos.id)}
              className={`rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                isSelected ? "border-primary ring-2 ring-primary/20" : isShort ? "border-amber-400 dark:border-amber-500" : "border-border hover:border-primary/30"
              } ${draggedStaff ? "ring-1 ring-primary/10" : ""}`}
            >
              {/* Header */}
              <div className="flex items-center gap-1 px-1.5 py-1 bg-muted/30 border-b border-border/40">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pos.color || "#6366f1" }} />
                <span className="text-xs font-semibold truncate flex-1">{pos.name}</span>
                {requiredCount > 0 && (
                  <span className={`text-[9px] font-bold px-1 rounded ${
                    isShort ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                  }`}>
                    {allNames.length}/{requiredCount}
                  </span>
                )}
              </div>

              {/* Staff avatars */}
              <div className="p-1.5 min-h-[3rem]">
                {splitBySide ? (
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { label: "上", names: kamite, side: "kamite" },
                      { label: "下", names: shimote, side: "shimote" },
                    ].map((side) => (
                      <div
                        key={side.side}
                        onDragOver={handleDragOver}
                        onDrop={(e) => { e.stopPropagation(); onDropOnPosition(e, pos.id, side.side); }}
                        className="min-h-[2rem]"
                      >
                        <div className="text-[9px] text-muted-foreground font-medium mb-0.5">{side.label}</div>
                        <div className="flex flex-wrap gap-0.5">
                          {side.names.length === 0 ? (
                            <span className="text-[9px] text-muted-foreground/50">—</span>
                          ) : side.names.map((name) => (
                            <StaffChip
                              key={name}
                              name={name}
                              staffList={staffList}
                              isAdmin={isAdmin}
                              onDragStart={onStaffDragStart}
                              onDragEnd={onStaffDragEnd}
                              onRemove={() => onStaffRemove(pos.id, name)}
                              isLocked={lockedNames.includes(name)}
                              pos={pos}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : allNames.length === 0 ? (
                  <div className="flex items-center justify-center min-h-[2rem]">
                    <span className="text-[10px] text-muted-foreground/50">ドロップで配置</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-0.5">
                    {allNames.map((name) => (
                      <StaffChip
                        key={name}
                        name={name}
                        staffList={staffList}
                        isAdmin={isAdmin}
                        onDragStart={onStaffDragStart}
                        onDragEnd={onStaffDragEnd}
                        onRemove={() => onStaffRemove(pos.id, name)}
                        isLocked={lockedNames.includes(name)}
                        pos={pos}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StaffChip({ name, staffList, isAdmin, onDragStart, onDragEnd, onRemove, isLocked, pos }) {
  const staff = staffList.find((s) => s.name === name);
  const displayName = getStaffDisplayName(name, false);
  const nameColor = staff?.color || undefined;

  return (
    <div
      draggable={isAdmin && !isLocked}
      onDragStart={isAdmin && !isLocked ? (e) => { e.stopPropagation(); onDragStart(e, name); } : undefined}
      onDragEnd={isAdmin ? onDragEnd : undefined}
      className="group relative flex items-center gap-0.5 rounded bg-primary/10 border border-primary/20 px-1 py-0.5 text-[10px] font-medium text-primary"
      style={nameColor ? { color: nameColor, borderColor: nameColor + "33", background: nameColor + "1a" } : undefined}
    >
      {displayName}
      {(staff?.roles || []).slice(0, 1).map((r) => <RoleIcon key={r} role={r} />)}
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
          title="解除"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}