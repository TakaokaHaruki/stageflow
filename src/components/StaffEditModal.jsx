import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { X, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SKILL_PRESETS = ["誘導", "受付", "音響", "照明", "映像", "司会", "警備", "救護", "物販", "清掃"];

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

export default function StaffEditModal({ staff, onClose, onSaved }) {
  const [localName, setLocalName] = useState(staff.name);
  const [localNote, setLocalNote] = useState(staff.note || "");
  const [localNoteBefore, setLocalNoteBefore] = useState(staff.note_before || "");
  const [localNoteDuring, setLocalNoteDuring] = useState(staff.note_during || "");
  const [localNoteAfter, setLocalNoteAfter] = useState(staff.note_after || "");
  const [localColor, setLocalColor] = useState(staff.color || "");
  const [localSkills, setLocalSkills] = useState(staff.skills || []);
  const [skillInput, setSkillInput] = useState("");
  const [noteTab, setNoteTab] = useState("all");
  const prevDataRef = useRef({
    name: staff.name, note: staff.note || "",
    note_before: staff.note_before || "", note_during: staff.note_during || "", note_after: staff.note_after || "",
    color: staff.color || "", skills: staff.skills || []
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
    if (
      localName === prev.name && localNote === prev.note &&
      localNoteBefore === prev.note_before && localNoteDuring === prev.note_during && localNoteAfter === prev.note_after &&
      localColor === prev.color && !skillsChanged
    ) return;
    const timer = setTimeout(() => {
      const nextData = {
        name: localName.trim(), note: localNote.trim(),
        note_before: localNoteBefore.trim(), note_during: localNoteDuring.trim(), note_after: localNoteAfter.trim(),
        color: localColor, skills: localSkills
      };
      updateMutation.mutate(nextData, {
        onSuccess: () => {
          toast.success("保存しました");
          prevDataRef.current = nextData;
        },
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [localName, localNote, localNoteBefore, localNoteDuring, localNoteAfter, localColor, localSkills]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-5"
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base">スタッフ編集</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="閉じる">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">スタッフ名</label>
            <Input value={localName} onChange={(e) => setLocalName(e.target.value)} className="mt-1" style={{ color: localColor || undefined }} />
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
            <label className="text-xs font-medium text-muted-foreground">スキルタグ</label>
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
              {SKILL_PRESETS.filter((s) => !localSkills.includes(s)).map((s) => (
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
                placeholder="カスタムスキルを入力"
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()}>
                <Plus className="w-3 h-3" />追加
              </Button>
            </div>
          </div>
          <div>
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
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" size="sm" onClick={onClose}>閉じる</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}