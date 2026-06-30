import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { unwrapFunctionResponse } from "@/lib/base44Response";
import {
  applyPositionSideMutation,
  applyPositionSideSettingsToTypes,
  loadPositionSideSettings,
  rememberPositionSideSettings,
} from "@/lib/positionSideSettings";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { X, Check, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useCaptureTags } from "@/hooks/useCaptureTags";
import { useAllRoles } from "@/hooks/useAllRoles";
import CategoryPicker from "@/components/CategoryPicker";

const PRESET_COLORS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#06b6d4", "#f97316",
];

export default function PositionFormModal({ position, eventId, defaultTimeSlot = "開場中", onClose, onSaved }) {
  const [form, setForm] = useState({
    name: position?.name || "",
    time_slot: position?.time_slot || defaultTimeSlot,
    staff_names: position?.staff_names || [],
    staff_names_kamite: position?.staff_names_kamite || [],
    staff_names_shimote: position?.staff_names_shimote || [],
    split_by_side: Boolean(position?.split_by_side),
    notes: position?.notes || "",
    color: position?.color || PRESET_COLORS[0],
    map_x: position?.map_x ?? null,
    map_y: position?.map_y ?? null,
    required_skills: position?.required_skills || [],
    required_roles: position?.required_roles || [],
    category: position?.category || "",
    event_id: eventId,
  });
  const [skillInput, setSkillInput] = useState("");
  const { tags: captureTags = [] } = useCaptureTags();
  const { allRoles, getBadgeClass } = useAllRoles();

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getStaffList", { eventId });
      return res?.data?.staff ?? [];
    },
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  // PositionType list for name selection (global, not event-specific)
  const { data: rawPositionTypes = [] } = useQuery({
    queryKey: ["positionTypes"],
    queryFn: () => base44.entities.PositionType.list(),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const { data: sideSettings } = useQuery({
    queryKey: ["positionSideSettings", eventId],
    queryFn: () => loadPositionSideSettings(base44, eventId),
    staleTime: 30_000,
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const positionTypes = applyPositionSideSettingsToTypes(rawPositionTypes, sideSettings);

  const queryClient = useQueryClient();

  const mutation = useMutation({
    scope: { id: `position-side-${eventId}` },
    mutationFn: async (data) => {
      const {
        staff_names_kamite,
        staff_names_shimote,
        split_by_side,
        ...positionFields
      } = data;
      if (position) {
        const response = await base44.functions.invoke("updatePositionSide", {
          action: "updatePositionStaff",
          eventId,
          positionId: position.id,
          ...data,
        });
        const payload = unwrapFunctionResponse(response);
        if (payload?.error) throw new Error(payload.error);
        return payload;
      }
      const response = await base44.functions.invoke("updatePositionSide", {
        action: "createPosition",
        eventId,
        position: {
          ...positionFields,
          staff_names: data.staff_names || [],
        },
        ...data,
      });
      const payload = unwrapFunctionResponse(response);
      if (payload?.error) throw new Error(payload.error);
      return payload;
    },
    onSuccess: (result) => {
      if (result?.sideSettings) {
        queryClient.setQueryData(["positionSideSettings", eventId], rememberPositionSideSettings(eventId, result.sideSettings));
      }
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      queryClient.invalidateQueries({ queryKey: ["staff", eventId] });
      onSaved();
    },
  });

  const savePosition = (nextForm, options) => {
    if (position?.id) {
      queryClient.setQueryData(["positionSideSettings", eventId], (old) =>
        applyPositionSideMutation(old, position.id, nextForm)
      );
    }
    mutation.mutate(nextForm, options);
  };

  // Auto-save on form changes (only for existing positions)
  // Text fields (name, notes) use 500ms debounce; all other changes save instantly
  const prevFormRef = useRef(form);
  const isTextChange = (prev, cur) =>
    prev.name !== cur.name || prev.notes !== cur.notes;
  const isNonTextChange = (prev, cur) =>
    prev.time_slot !== cur.time_slot ||
    prev.staff_names !== cur.staff_names ||
    prev.staff_names_kamite !== cur.staff_names_kamite ||
    prev.staff_names_shimote !== cur.staff_names_shimote ||
    prev.split_by_side !== cur.split_by_side ||
    prev.color !== cur.color ||
    prev.category !== cur.category ||
    JSON.stringify(prev.required_skills) !== JSON.stringify(cur.required_skills) ||
    JSON.stringify(prev.required_roles) !== JSON.stringify(cur.required_roles);

  useEffect(() => {
    if (!position) return;
    const prev = prevFormRef.current;
    const textChanged = isTextChange(prev, form);
    const nonTextChanged = isNonTextChange(prev, form);
    if (!textChanged && !nonTextChanged) return;

    const delay = nonTextChanged ? 0 : 500;
    const nextData = { ...form };
    const timer = setTimeout(() => {
      savePosition(nextData, {
        onSuccess: () => {
          toast.success("保存しました");
          prevFormRef.current = nextData;
        }
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [form]);

  const toggleStaff = (staffName, side = null) => {
    setForm((f) => {
      if (f.split_by_side && side) {
        const targetKey = side === "kamite" ? "staff_names_kamite" : "staff_names_shimote";
        const otherKey = side === "kamite" ? "staff_names_shimote" : "staff_names_kamite";
        const exists = f[targetKey].includes(staffName);
        const nextTarget = exists ? f[targetKey].filter((n) => n !== staffName) : [...f[targetKey], staffName];
        const nextOther = f[otherKey].filter((n) => n !== staffName);
        return {
          ...f,
          [targetKey]: nextTarget,
          [otherKey]: nextOther,
          staff_names: [...new Set([...nextTarget, ...nextOther])],
        };
      }
      const exists = f.staff_names.includes(staffName);
      return {
        ...f,
        staff_names: exists
          ? f.staff_names.filter((n) => n !== staffName)
          : [...f.staff_names, staffName],
      };
    });
  };

  const handleSplitBySideToggle = (enabled) => {
    setForm((f) => {
      if (enabled) {
        // 上手下手ON: 既存スタッフを全員上手に移動
        return {
          ...f,
          split_by_side: true,
          staff_names_kamite: [...f.staff_names],
          staff_names_shimote: [],
        };
      } else {
        // 上手下手OFF: kamite+shimoteをマージしてstaff_namesに戻す
        const merged = [...new Set([...f.staff_names_kamite, ...f.staff_names_shimote])];
        return {
          ...f,
          split_by_side: false,
          staff_names: merged,
          staff_names_kamite: [],
          staff_names_shimote: [],
        };
      }
    });
  };

  const handlePositionTypeSelect = (ptId) => {
    const pt = positionTypes.find((p) => p.id === ptId);
    if (pt) {
      const nextSplit = Boolean(pt.split_by_side);
      setForm((f) => {
        if (nextSplit === f.split_by_side) {
          return { ...f, name: pt.name, color: pt.color || f.color, category: pt.category || f.category };
        }
        if (nextSplit) {
          return { ...f, name: pt.name, color: pt.color || f.color, category: pt.category || f.category, split_by_side: true, staff_names_kamite: [...f.staff_names], staff_names_shimote: [] };
        } else {
          const merged = [...new Set([...f.staff_names_kamite, ...f.staff_names_shimote])];
          return { ...f, name: pt.name, color: pt.color || f.color, category: pt.category || f.category, split_by_side: false, staff_names: merged, staff_names_kamite: [], staff_names_shimote: [] };
        }
      });
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-4 max-h-[92vh] overflow-y-auto scrollbar-hide"
        initial={{ y: 34, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">{position ? "ポジション編集" : "ポジション追加"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="閉じる">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Position type selector */}
          <div>
            <Label>ポジション</Label>
            {positionTypes.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-1">{"\u7ba1\u7406\u30bf\u30d6\u3067\u30dd\u30b8\u30b7\u30e7\u30f3\u3092\u767b\u9332\u3057\u3066\u304f\u3060\u3055\u3044"}</p>
            ) : (
              <ResponsiveSelect
                value={positionTypes.find((pt) => pt.name === form.name)?.id || ""}
                onValueChange={handlePositionTypeSelect}
                options={positionTypes.map((pt) => ({
                  value: pt.id,
                  label: pt.name,
                }))}
                placeholder={"\u30dd\u30b8\u30b7\u30e7\u30f3\u3092\u9078\u629e"}
              />
            )}
          </div>

          <div>
            <Label>時間帯</Label>
            <ResponsiveSelect
              value={form.time_slot}
              onValueChange={(v) => setForm({ ...form, time_slot: v })}
              options={[
                { value: "開場中", label: "開場中" },
                { value: "開演中", label: "開演中" },
                { value: "終演後", label: "終演後" },
              ]}
              placeholder="時間帯を選択"
            />
          </div>

          {/* Staff selection - checklist dropdown */}
          <div>
            <Label>担当スタッフ</Label>
            {staffList.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">{"\u30b9\u30bf\u30c3\u30d5\u304c\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093"}</p>
            ) : form.split_by_side ? (
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "kamite", label: "\u4e0a\u624b", selected: form.staff_names_kamite },
                  { key: "shimote", label: "\u4e0b\u624b", selected: form.staff_names_shimote },
                ].map((side) => (
                  <div key={side.key} className="border border-border rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                    <div className="sticky top-0 bg-muted px-3 py-1 text-xs font-bold">{side.label}</div>
                    {staffList.map((staff) => {
                      const selected = side.selected.includes(staff.name);
                      return (
                        <button
                          key={`${side.key}-${staff.id}`}
                          type="button"
                          onClick={() => toggleStaff(staff.name, side.key)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left border-b border-border/50 last:border-b-0 transition-colors ${
                            selected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            selected ? "bg-primary border-primary" : "border-border"
                          }`}>
                            {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <span className="min-w-0 truncate">{staff.name}</span>
                          {staff.note && <span className="text-xs text-muted-foreground ml-auto">({staff.note})</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-1.5 border border-border rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                {staffList.map((staff) => {
                  const selected = form.staff_names.includes(staff.name);
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => toggleStaff(staff.name)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left border-b border-border/50 last:border-b-0 transition-colors ${
                        selected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                      </div>
                      {staff.name}
                      {staff.note && <span className="text-xs text-muted-foreground ml-auto">({staff.note})</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {form.staff_names.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">{form.staff_names.length}名選択中</p>
            )}
          </div>

          <div>
            <Label>マップ表示色</Label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>属性</Label>
            <div className="mt-1.5">
              <CategoryPicker value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
            </div>
          </div>

          <div>
            <Label>必要役割（自動配置で優先マッチング）</Label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {allRoles.map((role) => {
                const active = (form.required_roles || []).includes(role.name);
                return (
                  <button
                    key={role.name}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, required_roles: active ? f.required_roles.filter((r) => r !== role.name) : [...(f.required_roles || []), role.name] }))}
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${active ? getBadgeClass(role.name) : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {active ? "" : "+"}{role.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>必要捕まりタグ（自動配置で優先）</Label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(form.required_skills || []).map((skill) => (
                <span key={skill} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 text-xs font-medium">
                  {skill}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, required_skills: f.required_skills.filter((s) => s !== skill) }))} className="ml-0.5 hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {captureTags.filter((s) => !(form.required_skills || []).includes(s)).map((s) => (
                <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, required_skills: [...(f.required_skills || []), s] }))} className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors">
                  +{s}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    const s = skillInput.trim();
                    if (s && !(form.required_skills || []).includes(s)) {
                      setForm((f) => ({ ...f, required_skills: [...(f.required_skills || []), s] }));
                      setSkillInput("");
                    }
                  }
                }}
                placeholder="カスタムタグを入力"
                className="h-7 text-xs flex-1"
              />
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-0.5" type="button"
                onClick={() => {
                  const s = skillInput.trim();
                  if (s && !(form.required_skills || []).includes(s)) {
                    setForm((f) => ({ ...f, required_skills: [...(f.required_skills || []), s] }));
                    setSkillInput("");
                  }
                }}
                disabled={!skillInput.trim()}
              >
                <Plus className="w-3 h-3" />追加
              </Button>
            </div>
          </div>
          <div>
            <Label>備考</Label>
            <Input className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="メモなど" />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>閉じる</Button>
          {!position && (
            <Button
              className="flex-1"
              disabled={!form.name || mutation.isPending}
              onClick={() => savePosition({ ...form }, {
                onSuccess: () => {
                  toast.success("作成しました");
                  setTimeout(onClose, 500);
                }
              })}
            >
              {mutation.isPending ? "作成中..." : "作成"}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}