import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Clock, Link2, Link2Off } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function DetectedGroupList({ currentEventId, onApply }) {
  const queryClient = useQueryClient();
  const [assigningGroupId, setAssigningGroupId] = useState(null);

  const { data: detectedGroups = [] } = useQuery({
    queryKey: ["detectedLineGroups"],
    queryFn: () => base44.entities.DetectedLineGroup.list("-detected_at", 20),
    staleTime: 30000,
  });

  // 全イベントを取得してグループIDとの紐付けを把握
  const { data: allEvents = [] } = useQuery({
    queryKey: ["allEvents"],
    queryFn: () => base44.entities.Event.list("-date", 50),
    staleTime: 60000,
  });

  // group_id → 紐付けイベント のマップ
  const groupToEventMap = {};
  for (const ev of allEvents) {
    if (ev.line_group_id) {
      groupToEventMap[ev.line_group_id] = ev;
    }
  }

  const assignMutation = useMutation({
    mutationFn: ({ eventId, groupId }) =>
      base44.entities.Event.update(eventId, {
        line_notify_enabled: true,
        line_group_id: groupId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEvents"] });
      queryClient.invalidateQueries({ queryKey: ["event", currentEventId] });
      toast.success("グループを割り当てました");
      setAssigningGroupId(null);
    },
    onError: () => toast.error("割り当てに失敗しました"),
  });

  if (detectedGroups.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground px-1">
        検知済みのグループはありません。LINEグループ内でボットに「登録」とメッセージを送ると自動登録されます。
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {detectedGroups.map((g) => {
        const linkedEvent = groupToEventMap[g.group_id];
        const isLinkedToCurrentEvent = linkedEvent?.id === currentEventId;
        const isAssigning = assigningGroupId === g.id;

        return (
          <div key={g.id} className="bg-muted/50 rounded-lg px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{g.group_name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-mono">...{g.group_id.slice(-8)}</span>
                  {g.detected_at && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(g.detected_at), "M/d HH:mm", { locale: ja })}
                    </span>
                  )}
                </div>
                {/* 紐付けイベント名 */}
                {linkedEvent ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Link2 className="w-2.5 h-2.5 text-green-500 shrink-0" />
                    <span className={`text-[10px] font-medium ${isLinkedToCurrentEvent ? "text-green-600" : "text-blue-600"}`}>
                      {isLinkedToCurrentEvent ? "このイベント" : linkedEvent.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    <Link2Off className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground">未割り当て</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                {/* このイベントへ設定（グループIDをフォームに反映） */}
                <Button
                  size="sm"
                  variant={isLinkedToCurrentEvent ? "secondary" : "outline"}
                  className="h-6 text-[10px] px-2"
                  onClick={() => onApply(g)}
                >
                  {isLinkedToCurrentEvent ? "設定中" : "IDをセット"}
                </Button>

                {/* 別イベントへ直接割り当てるプルダウン */}
                {isAssigning ? (
                  <div className="flex flex-col gap-1 mt-1 w-36">
                    <select
                      className="text-[10px] border border-border rounded px-1 py-0.5 bg-background w-full"
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
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => setAssigningGroupId(null)}
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 text-muted-foreground"
                    onClick={() => setAssigningGroupId(g.id)}
                  >
                    イベント割り当て
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}