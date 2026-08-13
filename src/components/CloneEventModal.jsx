import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function CloneEventModal({ sourceEvent, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(`${sourceEvent?.name || ""}（コピー）`);
  const [date, setDate] = useState("");

  const mutation = useMutation({
    mutationFn: (payload) =>
      base44.functions.invoke("cloneEvent", payload).then((res) => res?.data?.event),
    onSuccess: (newEvent) => {
      toast.success("イベントをコピーして作成しました");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onClose();
      if (newEvent?.id) navigate(`/events/${newEvent.id}`);
    },
    onError: (err) => {
      toast.error(err?.message || "コピーに失敗しました");
    },
  });

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4"
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Copy className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold">イベントをコピーして新規作成</h2>
              <p className="text-[11px] text-muted-foreground">
                元：{sourceEvent?.name || ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            ポジション・スタッフ・緊急連絡先・マップエリア・配布資料など、元イベントの設定をまるごとコピーします。スタッフ配置（ポジションへの割当）も名前ベースで引き継がれます。
          </p>
          <div>
            <Label>新しいイベント名 *</Label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：〇〇コンサート2026"
            />
          </div>
          <div>
            <Label>開催日</Label>
            <Input
              className="mt-1 w-full"
              type="date"
              value={date}
              min="2000-01-01"
              max="2099-12-31"
              onChange={(e) => {
                const val = e.target.value;
                if (!val) { setDate(""); return; }
                const year = parseInt(val.split("-")[0], 10);
                if (year >= 2000 && year <= 2099) setDate(val);
              }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button
            className="flex-1 gap-1"
            disabled={!name.trim() || mutation.isPending}
            onClick={() => mutation.mutate({ sourceEventId: sourceEvent.id, name: name.trim(), date })}
          >
            <Copy className="w-3.5 h-3.5" />
            {mutation.isPending ? "コピー中..." : "コピーして作成"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}