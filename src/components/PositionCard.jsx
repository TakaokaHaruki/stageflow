import { useState, useEffect, useRef } from "react";
import { Pencil, Minus, Plus, Lock, LockOpen, AlertCircle } from "lucide-react";
import { getStaffDisplayName } from "@/lib/staffName";
import { getRoleBadgeClass } from "@/lib/staffRoles";

const SLOT_NOTE_KEY = { "開場中": "note_before", "開演中": "note_during", "終演後": "note_after" };

function StaffRow({ name, pos, staffList, maskStaffNames, draggable, isAdmin, draggedStaff, onStaffDragStart, onStaffDragEnd, onStaffEdit, onStaffRemove, onToggleLock, isLocked, side = null }) {
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [notePopupPos, setNotePopupPos] = useState(null);
  const noteIconRef = useRef(null);
  const staffData = staffList.find((s) => s.name === name);
  const displayName = getStaffDisplayName(name, maskStaffNames);
  const nameColor = staffData?.color || undefined;
  const slotNoteKey = SLOT_NOTE_KEY[pos.time_slot];
  const slotNote = slotNoteKey ? staffData?.[slotNoteKey] : null;
  const displayNote = slotNote || staffData?.note;

  useEffect(() => {
    if (!showNotePopup) return;
    const handler = (e) => {
      if (noteIconRef.current && !noteIconRef.current.contains(e.target)) setShowNotePopup(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showNotePopup]);

  const handleNoteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (showNotePopup) { setShowNotePopup(false); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setNotePopupPos({ left: rect.left, top: rect.bottom + 4 });
    setShowNotePopup(true);
  };

  return (
    <div
      draggable={draggable && isAdmin && !isLocked}
      onDragStart={draggable && isAdmin && !isLocked && onStaffDragStart ? (e) => onStaffDragStart(e, name, pos.id) : undefined}
      onDragEnd={draggable && isAdmin ? onStaffDragEnd : undefined}
      className={["flex min-h-8 items-center justify-between gap-1.5 px-2 py-0.5 select-none sm:min-h-0 sm:gap-2",
        isLocked ? "bg-amber-50/60 dark:bg-amber-900/20" : "",
        draggable && isAdmin && !isLocked ? "cursor-move hover:bg-muted/50" : "",
        draggable && draggedStaff === name ? "opacity-50" : ""].join(" ")}
    >
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {isLocked && <Lock className="w-2.5 h-2.5 text-amber-500 shrink-0" />}
        <span className="text-xs font-medium" style={{ color: nameColor }}>{displayName}</span>
        {displayNote && (
          <div className="relative shrink-0" ref={noteIconRef}>
            <button
              type="button"
              onClick={handleNoteClick}
              title={displayNote}
              className="flex items-center justify-center text-amber-500 hover:text-amber-600 transition-colors"
              aria-label="備考を表示"
            >
              <AlertCircle className="w-3 h-3" />
            </button>
            {showNotePopup && notePopupPos && (
              <div
                className="fixed z-50 bg-card border border-border shadow-md rounded-lg p-2 text-[10px] text-foreground max-w-48 break-all"
                style={{ left: notePopupPos.left, top: notePopupPos.top }}
              >
                {displayNote}
              </div>
            )}
          </div>
        )}
        {(staffData?.roles || []).map((role) => (
          <span key={role} className={`text-[10px] px-1 py-0.5 rounded border font-medium ${getRoleBadgeClass(role)}`}>{role}</span>
        ))}
        {(staffData?.skills || []).map((skill) => (
          <span key={skill} className="text-[10px] px-1 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">{skill}</span>
        ))}
        {staffData?.costume_change && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-purple-100 border border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300 font-medium">着替</span>
        )}
        {staffData?.break && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-300 font-medium">休憩</span>
        )}
      </div>
      {isAdmin && (
        <div className="flex items-center gap-0.5 shrink-0">
          {onToggleLock && (
            <button
              onClick={() => onToggleLock(name)}
              className={`flex h-7 w-7 items-center justify-center rounded transition-colors sm:h-5 sm:w-5 ${isLocked ? "text-amber-500 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40" : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"}`}
              title={isLocked ? "ロック解除" : "ロック（自動配置から除外）"}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
            </button>
          )}
          {onStaffEdit && staffData && (
            <button onClick={() => onStaffEdit(staffData, pos)} className="flex h-7 w-7 items-center justify-center rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors sm:h-5 sm:w-5" title="スタッフ編集">
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PositionCard({
  pos, isAdmin, draggable = false, draggedStaff = null,
  onEdit, onDragOver, onDrop, onStaffDragStart, onStaffDragEnd, onStaffRemove,
  onStaffEdit, onDropSide, onToggleLock, lockedNames = [],
  emptyLabel = "スタッフ未登録", staffList = [],
  requiredCount = 0, onRequiredCountChange, occupiedInSlot = [],
  maskStaffNames = false,
}) {
  const splitBySide = Boolean(pos.split_by_side);
  const kamiteStaffNames = pos.staff_names_kamite || [];
  const shimoteStaffNames = pos.staff_names_shimote || [];
  const staffNames = splitBySide ? [...new Set([...kamiteStaffNames, ...shimoteStaffNames])] : (pos.staff_names || []);
  const assignedCount = staffNames.length;
  const diff = requiredCount > 0 ? requiredCount - assignedCount : null;

  let statusBadge = null;
  if (requiredCount > 0) {
    if (diff > 0) statusBadge = { label: `残${diff}名`, cls: "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300" };
    else if (diff === 0) statusBadge = { label: "充足", cls: "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300" };
    else statusBadge = { label: `超過${Math.abs(diff)}名`, cls: "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300" };
  }

  const commonRowProps = { pos, staffList, maskStaffNames, draggable, isAdmin, draggedStaff, onStaffDragStart, onStaffDragEnd, onStaffEdit, onStaffRemove, onToggleLock };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
      onDragOver={onDragOver} onDrop={onDrop}>
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/60 bg-muted/20 select-none">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pos.color || "#6366f1" }} />
        <span className="text-xs font-semibold text-foreground">{pos.name}</span>
        {onRequiredCountChange && isAdmin ? (
          <div className="flex items-center border border-border/60 rounded overflow-hidden bg-background ml-1">
            <button type="button" onClick={() => onRequiredCountChange(Math.max(0, requiredCount - 1))}
              className="flex h-7 w-7 items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 sm:h-4 sm:w-4"><Minus className="w-2 h-2" /></button>
            <span className="w-5 text-center text-[11px] leading-7 sm:text-[10px] sm:leading-4">{requiredCount}</span>
            <button type="button" onClick={() => onRequiredCountChange(requiredCount + 1)}
              className="flex h-7 w-7 items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 sm:h-4 sm:w-4"><Plus className="w-2 h-2" /></button>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">{assignedCount}名</span>
        )}
        {statusBadge && <span className={`text-[10px] font-semibold px-1 py-0.5 rounded border ${statusBadge.cls}`}>{statusBadge.label}</span>}
        {pos.notes && <span className="text-[10px] text-muted-foreground truncate flex-1">{pos.notes}</span>}
        {onEdit && (
          <div className="flex gap-1 ml-auto flex-shrink-0">
            <button onClick={() => onEdit(pos)} disabled={!isAdmin} className="flex h-7 w-7 items-center justify-center rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none sm:h-5 sm:w-5" aria-label={`${pos.name}を編集`}><Pencil className="w-3 h-3" /></button>
          </div>
        )}
      </div>

      <div className="divide-y divide-border/40">
        {splitBySide ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
            {[
              { key: "kamite", label: "上手", names: kamiteStaffNames },
              { key: "shimote", label: "下手", names: shimoteStaffNames },
            ].map((side) => (
              <div
                key={side.key}
                onDragOver={onDragOver}
                onDrop={onDropSide ? (e) => onDropSide(e, side.key) : undefined}
                className="min-h-14"
              >
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground bg-muted/30">{side.label}</div>
                {side.names.length > 0 ? side.names.map((name, i) => (
                  <StaffRow key={`${pos.id}-${side.key}-${name}-${i}`} name={name} isLocked={lockedNames.includes(name)} {...commonRowProps} />
                )) : (
                  <div className="px-2 py-2 text-[11px] text-muted-foreground">{emptyLabel}</div>
                )}
              </div>
            ))}
          </div>
        ) : staffNames.length > 0 ? staffNames.map((name, i) => (
          <StaffRow key={draggable ? `${pos.id}-${name}` : i} name={name} isLocked={lockedNames.includes(name)} {...commonRowProps} />
        )) : (
          <div className="px-2 py-0.5 text-[11px] text-muted-foreground">{emptyLabel}</div>
        )}
      </div>
    </div>
  );
}