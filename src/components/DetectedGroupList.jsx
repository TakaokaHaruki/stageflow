import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Clock, Link2, Link2Off, Trash2, X, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function DetectedGroupList({ currentEventId, onApply }) {
  const queryClient = useQueryClient();
  const [assigningGroupId, setAssigningGroupId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: detectedGroups = [] } = useQuery({
    queryKey: ["detectedLineGroups"],
    queryFn: () => base44.entities.DetectedLineGroup.list("-detected_at", 20),
    staleTime: 30000,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ["allEvents"],
    queryFn: () => base44.entities.Event.list("-date", 50),
    staleTime: 60000,
  });

  const groupToEventMap = {};
  for (const ev of allEvents) {
    if (ev.line_group_id) groupToEventMap[ev.line_group_id] = ev;
  }

  const assignMutation = useMutation({
    mutationFn: ({ eventId, groupId }) =>
      base44.entities.Event.update(eventId, { line_notify_enabled: true, line_group_id: groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEvents"] });
      queryClient.invalidateQueries({ queryKey: ["event", currentEventId] });
      toast.success("グループを割り当てました");
      setAssigningGroupId(null);
    },
    onError: () => toast.error("割り当てに失敗しました"),
  });

  const unassignMutation = useMutation({
    mutationFn: ({ eventId }) =>
      base44.entities.Event.update(eventId, { line_notify_enabled: false, line_group_id: "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEvents"] });
      queryClient.invalidateQueries({ queryKey: ["event", currentEventId] });
      toast.success("割り当てを解除しました");
    },
    onError: () => toast.error("解除に失敗しました"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DetectedLineGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detectedLineGroups"] });
      toast.success("削除しました");
      setDeletingId(null);
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  if (detectedGroups.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground px-1 py-2 text-center">
        検知済みのグループはありません。<br />
        LINEグループ内でボットに「登録」と送信すると自動登録されます。
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {detectedGroups.map((g) => {
        const linkedEvent = groupToEventMap[g.group_id];
        const isLinkedToCurrentEvent = linkedEvent?.id === currentEventId;
        const isAssigning = assigningGroupId === g.id;
        const isConfirmingDelete = deletingId === g.id;

        return (
          <div
            key={g.id}
            className={`rounded-xl border overflow-hidden transition-colors ${
              isLinkedToCurrentEvent
                ? "border-green-400 dark:border-green-600 bg-green-50/60 dark:bg-green-900/20"
                : linkedEvent
                ? "border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/10"
                : "border-border bg-background"
            }`}
          >
            {/* ステータスバー */}
            <div className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium ${
              isLinkedToCurrentEvent
                ? "bg-green-500 text-white"
                : linkedEvent
                ? "bg-blue-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}>
              {isLinkedToCurrentEvent ? (
                <><CheckCircle2 className="w-3 h-3" />このイベントに設定中</>
              ) : linkedEvent ? (
                <><Link2 className="w-3 h-3" />{linkedEvent.name} に割り当て済み</>
              ) : (
                <><Link2Off className="w-3 h-3" />未割り当て</>
              )}
            </div>

            {/* メインコンテンツ */}
            <div className="px-3 py-2 flex items-start justify-between gap-2">
              {/* 左：グループ情報 */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate leading-tight">{g.group_name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                    ...{g.group_id.slice(-8)}
                  </span>
                  {g.detected_at && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(g.detected_at), "M/d HH:mm", { locale: ja })}
                    </span>
                  )}
                </div>
              </div>

              {/* 右：削除 */}
              <div className="shrink-0">
                {!isConfirmingDelete ? (
                  <button
                    onClick={() => setDeletingId(g.id)}
                    className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                    title="このグループを削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-destructive font-medium">削除?</span>
                    <button
                      onClick={() => deleteMutation.mutate(g.id)}
                      disabled={deleteMutation.isPending}
                      className="text-[10px] px-2 py-0.5 rounded bg-destructive text-white font-semibold hover:bg-destructive/90 transition-colors"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="p-0.5 rounded hover:bg-muted text-muted-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* アクションエリア */}
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              <button
                onClick={() => onApply(g)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  isLinkedToCurrentEvent
                    ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700"
                    : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                }`}
              >
                {isLinkedToCurrentEvent ? "✓ 設定中" : "IDをセット"}
              </button>

              {linkedEvent && (
                <button
                  onClick={() => unassignMutation.mutate({ eventId: linkedEvent.id })}
                  disabled={unassignMutation.isPending}
                  className="text-[10px] px-2.5 py-1 rounded-lg border border-border bg-muted text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors font-medium"
                >
                  割り当て解除
                </button>
              )}

              {!isAssigning ? (
                <button
                  onClick={() => setAssigningGroupId(g.id)}
                  className="text-[10px] px-2.5 py-1 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors font-medium"
                >
                  {linkedEvent ? "割り当て変更" : "イベントに割り当て"}
                </button>
              ) : (
                <div className="flex items-center gap-1 w-full mt-0.5">
                  <select
                    className="text-[10px] border border-border rounded-lg px-1.5 py-1 bg-background flex-1"
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      assignMutation.mutate({ eventId: e.target.value, groupId: g.group_id });
                    }}
                  >
                    <option value="">イベントを選択...</option>
                    {allEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setAssigningGroupId(null)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}