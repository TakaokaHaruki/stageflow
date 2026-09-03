import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { TIME_SLOTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

// 部間同期設定モーダル
// event.show_sync: { "開場中": [1,2], ... }  ※1スロット1グループ
export default function ShowSyncModal({ eventId, event, partsCount, onClose }) {
  const queryClient = useQueryClient();
  const initialSync = event?.show_sync || {};
  const [sync, setSync] = useState(() => {
    const obj = {};
    for (const slot of TIME_SLOTS) obj[slot] = Array.isArray(initialSync[slot]) ? [...initialSync[slot]] : [];
    return obj;
  });
  const [saving, setSaving] = useState(false);

  const partNumbers = Array.from({ length: Math.max(1, partsCount) }, (_, i) => i + 1);

  const togglePart = (slot, part) => {
    setSync((prev) => {
      const cur = prev[slot] || [];
      return { ...prev, [slot]: cur.includes(part) ? cur.filter((p) => p !== part) : [...cur, part] };
    });
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      const ops = [];
      for (const slot of TIME_SLOTS) {
        const oldGroup = Array.isArray(initialSync[slot]) ? [...initialSync[slot]].sort((a, b) => a - b) : [];
        const newGroup = [...(sync[slot] || [])].sort((a, b) => a - b);
        const oldKey = oldGroup.join(",");
        const newKey = newGroup.join(",");
        if (oldKey === newKey) continue;
        if (oldGroup.length >= 2) {
          ops.push(base44.functions.invoke("updatePositionSide", {
            action: "syncShowParts", eventId, timeSlot: slot, group: oldGroup, mode: "unlink",
          }));
        }
        if (newGroup.length >= 2) {
          ops.push(base44.functions.invoke("updatePositionSide", {
            action: "syncShowParts", eventId, timeSlot: slot, group: newGroup, mode: "sync",
          }));
        }
      }
      const nextShowSync = {};
      for (const slot of TIME_SLOTS) {
        const g = [...(sync[slot] || [])].sort((a, b) => a - b);
        if (g.length >= 2) nextShowSync[slot] = g;
      }
      ops.push(base44.entities.Event.update(eventId, { show_sync: nextShowSync }));
      const results = await Promise.allSettled(ops);
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length) {
        const firstErr = failed.find((r) => r.reason);
        throw new Error(firstErr?.reason?.message || "同期処理に失敗しました");
      }
      return nextShowSync;
    },
    onMutate: async (nextShowSync) => {
      await queryClient.cancelQueries({ queryKey: ["event", eventId] });
      const prev = queryClient.getQueryData(["event", eventId]);
      queryClient.setQueryData(["event", eventId], (old) => (old ? { ...old, show_sync: nextShowSync } : old));
      return { prev };
    },
    onError: (err) => {
      toast.error(err?.message || "同期設定の保存に失敗しました");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("部間同期設定を保存しました");
      onClose();
    },
  });

  const handleConfirm = () => {
    setSaving(true);
    applyMutation.mutateAsync().finally(() => setSaving(false));
  };

  const groupLabel = (group) => group.slice().sort((a, b) => a - b).map((p) => p + "部").join("・");

  return (
    <motion.div
      className="fixed inset-0 z-[100] h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-2xl shadow-xl w-full sm:max-w-md p-5 max-h-[90dvh] overflow-y-auto scrollbar-hide"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold">部間同期設定</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="閉じる">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
          同じ時間帯を複数の部で同期すると、その時間帯の配置を1つの部として共有します。いずれかの部で編集すると、同期中のすべての部にリアルタイムで反映されます。チェックを外すと同期が解除され、部ごとに独立した配置になります。
        </p>

        <div className="space-y-2.5">
          {TIME_SLOTS.map((slot) => {
            const group = sync[slot] || [];
            const synced = group.length >= 2;
            return (
              <div key={slot} className="rounded-lg border border-border bg-muted/30 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold">{slot}</span>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border", synced ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300" : "bg-muted border-border text-muted-foreground")}>
                    {synced ? "同期：" + groupLabel(group) : "独立"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {partNumbers.map((part) => {
                    const active = group.includes(part);
                    return (
                      <button
                        key={part}
                        type="button"
                        onClick={() => togglePart(slot, part)}
                        className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors", active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50")}
                      >
                        {part}部
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>キャンセル</Button>
          <Button className="flex-1 gap-1" onClick={handleConfirm} disabled={saving || applyMutation.isPending}>
            {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />保存中...</> : "保存"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}