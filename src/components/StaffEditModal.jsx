import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { X, Plus, UserMinus, Lock, LockOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCaptureTags } from "@/hooks/useCaptureTags";
import { useAllRoles } from "@/hooks/useAllRoles";
import RoleIcon from "@/components/RoleIcon";
import StaffTrendSummary from "@/components/StaffTrendSummary";
import { useOperationLog } from "@/hooks/useOperationLog";

const PRESET_COLORS = [
  { label: "デフォルト", value: "" },
  { label: "赤", value: "#ef4444" },
  { label: "オレンジ", value: "#f97316" },
  { label: "黄", value: "#eab308" },
  { label: "緑", value: "#22c55e" },
  { label: "青", value: "#3b82f6" },
  { label: "紫", value: "#a855f7" },
  { label: "ピンク", value: "#ec4899" },
  { label: "白", value: "#ffffff" },
];

export default function StaffEditModal({ staff, pos, onRemoveFromPosition, onClose, onSaved, isLocked = false, onToggleLock }) {
  const [localName, setLocalName] = useState(staff.name);
  const [localAcastId, setLocalAcastId] = useState(staff.acast_id || "");
  const [localGender, setLocalGender] = useState(staff.gender || "");
  const [localNote, setLocalNote] = useState(staff.note || "");
  const [localNoteBefore, setLocalNoteBefore] = useState(staff.note_before || "");
  const [localNoteDuring, setLocalNoteDuring] = useState(staff.note_during || "");
  const [localNoteAfter, setLocalNoteAfter] = useState(staff.note_after || "");
  const [localColor, setLocalColor] = useState(staff.color || "");
  const [localSkills, setLocalSkills] = useState(staff.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [localRoles, setLocalRoles] = useState(staff.roles || []);
  const [roleInput, setRoleInput] = useState("");
  const [noteTab, setNoteTab] = useState("all");
  const { tags: captureTags = [] } = useCaptureTags();
  const { allRoles, getBadgeClass } = useAllRoles();
  const { record } = useOperationLog(staff.event_id);
  const prevDataRef = useRef({
    name: staff.name, acast_id: staff.acast_id || "", gender: staff.gender || "", note: staff.note || "",
    note_before: staff.note_before || "", note_during: staff.note_during || "", note_after: staff.note_after || "",
    color: staff.color || "", skills: staff.skills || [], roles: staff.roles || []
  });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke("updateStaffRecord", { action: "update", staffId: staff.id, data });
      return res?.data?.staff;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["staff", staff.event_id] });
      await queryClient.cancelQueries({ queryKey: ["positions", staff.event_id] });
      const previousStaff = queryClient.getQueryData(["staff", staff.event_id]);
      const previousPositions = queryClient.getQueryData(["positions", staff.event_id]);
      queryClient.setQueryData(["staff", staff.event_id], (old = []) =>
        old.map((item) => item.id === staff.id ? { ...item, ...data } : item)
      );
      const previousName = prevDataRef.current.name;
      if (data.name && data.name !== previousName) {
        queryClient.setQueryData(["positions", staff.event_id], (old = []) =>
          old.map((position) => ({
            ...position,
            staff_names: (position.staff_names || []).map((name) => name === previousName ? data.name : name),
          }))
        );
      }
      return { previousStaff, previousPositions };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["staff", staff.event_id], context?.previousStaff);
      queryClient.setQueryData(["positions", staff.event_id], context?.previousPositions);
      toast.error("保存に失敗しました");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", staff.event_id] });
      queryClient.invalidateQueries({ queryKey: ["positions", staff.event_id] });
      onSaved?.();
    },
  });

  const addSkill = (skill) => {
    const s = skill.trim();
    if (!s || localSkills.includes(s)) return;
    setLocalSkills((prev) => [...prev, s]);
    setSkillInput("");
  };
  const removeSkill = (skill) => setLocalSkills((prev) => prev.filter((s) => s !== skill));

  useEffect(() => {
    if (!localName.trim()) return;
    const prev = prevDataRef.current;
    const skillsChanged = JSON.stringify(localSkills) !== JSON.stringify(prev.skills);
    const rolesChanged = JSON.stringify(localRoles) !== JSON.stringify(prev.roles);
    if (
      localName === prev.name && localAcastId === prev.acast_id && localGender === prev.gender && localNote === prev.note &&
      localNoteBefore === prev.note_before && localNoteDuring === prev.note_during && localNoteAfter === prev.note_after &&
      localColor === prev.color && !skillsChanged && !rolesChanged
    ) return;
    const timer = setTimeout(() => {
      const nextData = {
        name: localName.trim(), acast_id: localAcastId.trim(), gender: localGender, note: localNote.trim(),
        note_before: localNoteBefore.trim(), note_during: localNoteDuring.trim(), note_after: localNoteAfter.trim(),
        color: localColor, skills: localSkills, roles: localRoles
      };
      updateMutation.mutate(nextData, {
        onSuccess: () => {
          toast.success("保存しました");
          record({
            action_type: "staff_update",
            description: `スタッフ「${prevDataRef.current.name}」の情報を更新しました`,
            entity_type: "Staff",
            entity_id: staff.id,
            snapshot_before: prevDataRef.current,
            snapshot_after: nextData,
          });
          prevDataRef.current = nextData;
        },
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localName, localAcastId, localGender, localNote, localNoteBefore, localNoteDuring, localNoteAfter, localColor, localSkills, localRoles]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90dvh] overflow-y-auto scrollbar-hide"
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-base">スタッフ編集</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="閉じる">
            <X className="w-4 h-4" />
          </button>
        </div>
        {(onToggleLock || (pos && onRemoveFromPosition)) && (
          <div className="flex gap-2 mb-3">
            {pos && onRemoveFromPosition && (
              <Button
                variant="destructive"
                className="flex-1 gap-1"
                size="sm"
                onClick={() => onRemoveFromPosition(pos.id, staff.name)}
              >
                <UserMinus className="w-3.5 h-3.5" />
                このポジションから外す
              </Button>
            )}
            {onToggleLock && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleLock(staff.name)}
                className={`flex-1 gap-1 ${isLocked ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300" : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-600"}`}
                title={isLocked ? "ロック解除" : "ロック（自動配置から除外）"}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                {isLocked ? "固定中" : "固定"}
              </Button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">スタッフ名</label>
            <Input value={localName} onChange={(e) => setLocalName(e.target.value)} className="mt-1" style={{ color: localColor || undefined }} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">A-CAST ID</label>
            <Input value={localAcastId} onChange={(e) => setLocalAcastId(e.target.value)} className="mt-1" placeholder="例：AC-12345" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">性別</label>
            <div className="mt-1.5 flex gap-1.5">
              {["男", "女"].map((g) => {
                const active = localGender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      const next = active ? "" : g;
                      setLocalGender(next);
                      setLocalColor(next === "男" ? "#2563eb" : next === "女" ? "#dc2626" : "");
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${active ? (g === "男" ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-rose-100 border-rose-300 text-rose-700") : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {g}
                  </button>
                );
              })}
              {localGender && (
                <button type="button" onClick={() => { setLocalGender(""); setLocalColor(""); }} className="px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground">
                  未設定
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">備考</label>
            <div className="mt-1.5 flex gap-0.5 bg-muted rounded-md p-0.5">
              {[
                { key: "all", label: "すべて" },
                { key: "before", label: "開場中" },
                { key: "during", label: "開演中" },
                { key: "after", label: "終演後" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setNoteTab(tab.key)}
                  className={`flex-1 text-[11px] font-medium px-1 py-1 rounded transition-colors ${noteTab === tab.key ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-1.5">
              {noteTab === "all" && (
                <Input value={localNote} onChange={(e) => setLocalNote(e.target.value)} placeholder="全時間帯共通の備考" className="h-8 text-xs" />
              )}
              {noteTab === "before" && (
                <Input value={localNoteBefore} onChange={(e) => setLocalNoteBefore(e.target.value)} placeholder="開場中の備考" className="h-8 text-xs" />
              )}
              {noteTab === "during" && (
                <Input value={localNoteDuring} onChange={(e) => setLocalNoteDuring(e.target.value)} placeholder="開演中の備考" className="h-8 text-xs" />
              )}
              {noteTab === "after" && (
                <Input value={localNoteAfter} onChange={(e) => setLocalNoteAfter(e.target.value)} placeholder="終演後の備考" className="h-8 text-xs" />
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">役割</label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {allRoles.map((role) => {
                const active = localRoles.includes(role.name);
                return (
                  <button
                    key={role.name}
                    type="button"
                    onClick={() => setLocalRoles((prev) => active ? prev.filter((r) => r !== role.name) : [...prev, role.name])}
                    className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${active ? getBadgeClass(role.name) : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    <RoleIcon role={role.name} className="w-3 h-3" />
                    {active ? "" : "+"}{role.name}
                    {active && (
                      <span className="ml-0.5 hover:text-destructive transition-colors" onClick={(e) => { e.stopPropagation(); setLocalRoles((prev) => prev.filter((r) => r !== role.name)); }}>
                        <X className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
              {localRoles.filter((r) => !allRoles.some((ar) => ar.name === r)).map((role) => (
                <span key={role} className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-medium">
                  <RoleIcon role={role} className="w-3 h-3" />
                  {role}
                  <button onClick={() => setLocalRoles((prev) => prev.filter((r) => r !== role))} className="ml-0.5 hover:text-destructive transition-colors" aria-label="削除">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); const r = roleInput.trim(); if (r && !localRoles.includes(r)) { setLocalRoles((prev) => [...prev, r]); setRoleInput(""); } } }}
                placeholder="カスタム役割を入力"
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" onClick={() => { const r = roleInput.trim(); if (r && !localRoles.includes(r)) { setLocalRoles((prev) => [...prev, r]); setRoleInput(""); } }} disabled={!roleInput.trim()}>
                <Plus className="w-3 h-3" />追加
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">捕まりタグ</label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {localSkills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-medium">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="ml-0.5 hover:text-destructive transition-colors" aria-label="削除">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {captureTags.filter((s) => !localSkills.includes(s)).map((s) => (
                <button key={s} onClick={() => addSkill(s)} className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors">
                  +{s}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); addSkill(skillInput); } }}
                placeholder="カスタムタグを入力"
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()}>
                <Plus className="w-3 h-3" />追加
              </Button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">表示文字色</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setLocalColor(c.value)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors ${localColor === c.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                  title={c.label}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full border border-border/60"
                    style={{ backgroundColor: c.value || "transparent", outline: !c.value ? "1px dashed #aaa" : "none" }}
                  />
                  <span style={{ color: c.value || undefined }}>{c.label}</span>
                </button>
              ))}
              <div className="flex items-center gap-1 border border-border rounded-md px-2 py-1">
                <span className="text-xs text-muted-foreground">カスタム</span>
                <input
                  type="color"
                  value={localColor || "#000000"}
                  onChange={(e) => setLocalColor(e.target.value)}
                  className="w-6 h-5 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <StaffTrendSummary staffName={localName} />
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" size="sm" onClick={onClose}>閉じる</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}