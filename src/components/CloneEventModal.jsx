import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ModalShell, { ModalHeader, ModalFooter } from "@/components/ModalShell";

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
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <ModalHeader
        icon={
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Copy className="w-4 h-4 text-primary" />
          </div>
        }
        title="イベントをコピーして新規作成"
        onClose={onClose}
      />
      <p className="text-xs text-muted-foreground mb-3">元：{sourceEvent?.name || ""}</p>

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

      <ModalFooter>
        <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
        <Button
          className="flex-1 gap-1"
          disabled={!name.trim() || mutation.isPending}
          onClick={() => mutation.mutate({ sourceEventId: sourceEvent.id, name: name.trim(), date })}
        >
          <Copy className="w-3.5 h-3.5" />
          {mutation.isPending ? "コピー中..." : "コピーして作成"}
        </Button>
      </ModalFooter>
    </ModalShell>
  );
}