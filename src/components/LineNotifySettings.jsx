import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle } from "lucide-react";

export default function LineNotifySettings({ eventId, event }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    if (event) {
      setEnabled(Boolean(event.line_notify_enabled));
      setGroupId(event.line_group_id || "");
    }
  }, [event?.id]);

  const saveMutation = useMutation({
    mutationFn: () =>
      base44.entities.Event.update(event.id, {
        line_notify_enabled: enabled,
        line_group_id: enabled ? groupId.trim() : "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      toast.success("LINE通知設定を保存しました");
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const isDirty =
    enabled !== Boolean(event?.line_notify_enabled) ||
    groupId !== (event?.line_group_id || "");

  return (
    <div className="bg-card border border-border rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold">LINE通知</p>
            <p className="text-[10px] text-muted-foreground">連絡事項作成時にLINEグループへ通知します</p>
          </div>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`relative w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 ${enabled ? "bg-green-500" : "bg-muted-foreground/30"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </div>

      {enabled && (
        <div className="mt-2.5 space-y-1.5">
          <Input
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="C... で始まるグループID"
            className="h-8 text-sm font-mono"
          />
          <p className="text-[10px] text-muted-foreground">LINEグループIDは「C」で始まる文字列です（例: C1234abcd...）</p>
        </div>
      )}

      {isDirty && (
        <Button
          size="sm"
          className="mt-2 h-7 text-xs w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || (enabled && !groupId.trim())}
        >
          {saveMutation.isPending ? "保存中..." : "保存"}
        </Button>
      )}
    </div>
  );
}