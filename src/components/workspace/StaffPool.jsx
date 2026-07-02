import { useState, useMemo } from "react";
import { Search, Lock, LockOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import RoleIcon from "@/components/RoleIcon";
import { getStaffDisplayName } from "@/lib/staffName";
import { TIME_SLOTS } from "@/lib/constants";

export default function StaffPool({
  staffList,
  allAssignedNames,
  allSkills,
  skillFilter,
  onSkillFilterChange,
  selectedStaffId,
  onSelectStaff,
  onDragStart,
  onDragEnd,
  draggedStaff,
  onToggleFlag,
  isLocked,
  onToggleLock,
  isAdmin,
  continuousMode,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return staffList
      .filter((s) => {
        if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (skillFilter && !(s.skills || []).includes(skillFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        const aAssigned = allAssignedNames.has(a.name);
        const bAssigned = allAssignedNames.has(b.name);
        if (aAssigned === bAssigned) return 0;
        return aAssigned ? 1 : -1;
      });
  }, [staffList, search, skillFilter, allAssignedNames]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold">スタッフプール</span>
          <span className="text-[10px] text-muted-foreground">{filtered.length}名</span>
        </div>
        <div className="relative">
          <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前で検索"
            className="h-7 pl-6 text-xs"
          />
        </div>
      </div>

      {/* Skill filter chips */}
      {allSkills.length > 0 && (
        <div className="flex flex-wrap gap-0.5 px-2 py-1.5 border-b border-border">
          <button
            onClick={() => onSkillFilterChange(null)}
            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors ${
              !skillFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            全て
          </button>
          {allSkills.map((skill) => (
            <button
              key={skill}
              onClick={() => onSkillFilterChange(skillFilter === skill ? null : skill)}
              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium transition-colors ${
                skillFilter === skill
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      {/* Staff list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">該当なし</p>
        ) : (
          filtered.map((s) => {
            const isAssigned = allAssignedNames.has(s.name);
            const isSelected = selectedStaffId === s.id;
            const displayName = getStaffDisplayName(s.name, false);
            return (
              <div
                key={s.id}
                draggable={isAdmin}
                onDragStart={isAdmin ? (e) => onDragStart(e, s.name) : undefined}
                onDragEnd={isAdmin ? onDragEnd : undefined}
                onClick={() => onSelectStaff(s.id)}
                className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer border-b border-border/40 transition-colors ${
                  isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                } ${draggedStaff === s.name ? "opacity-50" : ""} ${isAssigned ? "opacity-60" : ""}`}
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[9px] shrink-0">
                  {displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs font-medium truncate" style={{ color: s.color || undefined }}>{displayName}</span>
                    {(s.roles || []).map((r) => <RoleIcon key={r} role={r} />)}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap mt-0.5">
                    {!isAssigned && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">未配置</span>
                    )}
                    {(s.skills || []).map((sk) => (
                      <span key={sk} className="text-[9px] px-1 rounded bg-primary/10 text-primary border border-primary/20">{sk}</span>
                    ))}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFlag(s.id, "costume_change", !s.costume_change); }}
                      className={`text-[9px] px-1 rounded border transition-colors ${
                        s.costume_change ? "bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      着替
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFlag(s.id, "break", !s.break); }}
                      className={`text-[9px] px-1 rounded border transition-colors ${
                        s.break ? "bg-sky-100 border-sky-300 text-sky-700 dark:bg-sky-900/40 dark:border-sky-700 dark:text-sky-300" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      休
                    </button>
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleLock(s.name); }}
                    className="shrink-0 text-muted-foreground hover:text-amber-500 transition-colors"
                    title={isLocked(s.name) ? "ロック解除" : "ロック"}
                  >
                    {isLocked(s.name) ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
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