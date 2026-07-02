import { X, User, AlertCircle } from "lucide-react";
import RoleIcon from "@/components/RoleIcon";
import { getStaffDisplayName } from "@/lib/staffName";
import { TIME_SLOTS, TIME_SLOT_STYLES } from "@/lib/constants";

export default function ContextPanel({ selectedStaff, selectedPosition, staffList, positions, isAdmin, onRemoveStaff, onClearSelection }) {
  const hasSelection = selectedStaff || selectedPosition;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/30">
        <span className="text-xs font-bold">詳細パネル</span>
        {hasSelection && (
          <button onClick={onClearSelection} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-2">
        {!hasSelection ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <User className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">スタッフまたはポジションを<br />選択すると詳細が表示されます</p>
          </div>
        ) : selectedStaff ? (
          <StaffDetail staff={selectedStaff} positions={positions} isAdmin={isAdmin} onRemoveStaff={onRemoveStaff} />
        ) : (
          <PositionDetail position={selectedPosition} staffList={staffList} isAdmin={isAdmin} onRemoveStaff={onRemoveStaff} />
        )}
      </div>
    </div>
  );
}

function StaffDetail({ staff, positions, isAdmin, onRemoveStaff }) {
  const displayName = getStaffDisplayName(staff.name, false);
  const myPositions = positions.filter((p) => {
    return (p.staff_names || []).includes(staff.name) ||
      (p.staff_names_kamite || []).includes(staff.name) ||
      (p.staff_names_shimote || []).includes(staff.name);
  });

  const missingSlots = TIME_SLOTS.filter((slot) =>
    !myPositions.some((p) => (p.time_slot || "開場中") === slot)
  );

  return (
    <div className="space-y-3">
      {/* Profile */}
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: staff.color || undefined }}>{displayName}</p>
          {staff.note && <p className="text-[10px] text-muted-foreground truncate">{staff.note}</p>}
        </div>
      </div>

      {/* Roles & Skills */}
      {(staff.roles?.length > 0 || staff.skills?.length > 0) && (
        <div className="space-y-1">
          {staff.roles?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {staff.roles.map((r) => <RoleIcon key={r} role={r} />)}
            </div>
          )}
          {staff.skills?.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {staff.skills.map((sk) => (
                <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-medium">{sk}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status flags */}
      <div className="flex flex-wrap gap-1">
        {staff.costume_change && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 border border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300 font-medium">着替え</span>}
        {staff.break && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-300 font-medium">休憩</span>}
        {missingSlots.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300 font-medium">
            <AlertCircle className="w-2.5 h-2.5" />{missingSlots.length}スロット未配置
          </span>
        )}
      </div>

      {/* Slot notes */}
      {(staff.note_before || staff.note_during || staff.note_after) && (
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground">時間帯別メモ</p>
          {staff.note_before && <p className="text-[10px] text-muted-foreground">開場中: {staff.note_before}</p>}
          {staff.note_during && <p className="text-[10px] text-muted-foreground">開演中: {staff.note_during}</p>}
          {staff.note_after && <p className="text-[10px] text-muted-foreground">終演後: {staff.note_after}</p>}
        </div>
      )}

      {/* Current assignments */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground">現在の配置 ({myPositions.length}件)</p>
        {myPositions.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60">配置されていません</p>
        ) : (
          myPositions.map((p) => {
            const slot = p.time_slot || "開場中";
            const style = TIME_SLOT_STYLES[slot] || TIME_SLOT_STYLES["開場中"];
            return (
              <div key={p.id} className={`flex items-center justify-between gap-1 rounded border px-1.5 py-1 ${style.badge}`}>
                <span className="text-[10px] font-semibold truncate">{p.name}</span>
                <span className="text-[9px] opacity-70 shrink-0">{slot}</span>
                {isAdmin && (
                  <button
                    onClick={() => onRemoveStaff(p.id, staff.name)}
                    className="text-[10px] hover:underline shrink-0"
                  >
                    解除
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PositionDetail({ position, staffList, isAdmin, onRemoveStaff }) {
  if (!position) return null;
  const splitBySide = Boolean(position.split_by_side);
  const kamite = position.staff_names_kamite || [];
  const shimote = position.staff_names_shimote || [];
  const allNames = splitBySide ? [...new Set([...kamite, ...shimote])] : (position.staff_names || []);
  const requiredCount = position.required_count ?? 0;
  const diff = requiredCount > 0 ? requiredCount - allNames.length : null;

  return (
    <div className="space-y-3">
      {/* Position header */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: position.color || "#6366f1" }} />
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{position.name}</p>
          <p className="text-[10px] text-muted-foreground">{position.time_slot || "開場中"}</p>
        </div>
      </div>

      {/* Count status */}
      {requiredCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">配置状況:</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            diff > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}>
            {allNames.length}/{requiredCount}
          </span>
          {diff > 0 && <span className="text-[10px] text-amber-600">あと{diff}名必要</span>}
        </div>
      )}

      {/* Required skills */}
      {(position.required_skills?.length > 0 || position.required_roles?.length > 0) && (
        <div className="space-y-1">
          {position.required_skills?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">推奨スキル</p>
              <div className="flex flex-wrap gap-0.5">
                {position.required_skills.map((sk) => (
                  <span key={sk} className="text-[10px] px-1 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">{sk}</span>
                ))}
              </div>
            </div>
          )}
          {position.required_roles?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">必要役割</p>
              <div className="flex flex-wrap gap-0.5">
                {position.required_roles.map((r) => (
                  <span key={r} className="text-[10px] px-1 py-0.5 rounded bg-accent/10 border border-accent/30 text-accent">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {position.notes && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">備考</p>
          <p className="text-[10px] text-foreground bg-muted/30 rounded p-1.5">{position.notes}</p>
        </div>
      )}

      {/* Assigned staff */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground">配置スタッフ ({allNames.length}名)</p>
        {allNames.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/60">配置されていません</p>
        ) : splitBySide ? (
          <div className="space-y-1.5">
            {[
              { label: "上手", names: kamite },
              { label: "下手", names: shimote },
            ].filter((s) => s.names.length > 0).map((side) => (
              <div key={side.label}>
                <p className="text-[9px] text-muted-foreground font-medium">{side.label}</p>
                <div className="space-y-0.5">
                  {side.names.map((name) => (
                    <StaffRow key={name} name={name} staffList={staffList} isAdmin={isAdmin} onRemove={() => onRemoveStaff(position.id, name)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {allNames.map((name) => (
              <StaffRow key={name} name={name} staffList={staffList} isAdmin={isAdmin} onRemove={() => onRemoveStaff(position.id, name)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StaffRow({ name, staffList, isAdmin, onRemove }) {
  const staff = staffList.find((s) => s.name === name);
  const displayName = getStaffDisplayName(name, false);
  const nameColor = staff?.color || undefined;

  return (
    <div className="flex items-center justify-between gap-1 rounded bg-muted/30 px-1.5 py-1">
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-[11px] font-medium truncate" style={{ color: nameColor }}>{displayName}</span>
        {(staff?.roles || []).map((r) => <RoleIcon key={r} role={r} />)}
      </div>
      {isAdmin && (
        <button onClick={onRemove} className="text-[10px] text-destructive hover:underline shrink-0">
          解除
        </button>
      )}
    </div>
  );
}