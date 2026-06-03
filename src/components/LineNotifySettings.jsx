import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// LINEグループIDの形式チェック: C + 32文字の英数字
function isValidGroupIdFormat(id) {
  return /^C[a-zA-Z0-9]{32}$/.test(id);
}

function GroupIdStatus({ status, groupInfo }) {
  if (!status) return null;
  if (status === "checking") {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] mt-1">
        <div className="w-3 h-3 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />
        グループ情報を確認中...
      </div>
    );
  }
  if (status === "ok") {
    return (
      <div className="flex items-center gap-1.5 text-green-600 text-[11px] mt-1 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        グループ確認済：{groupInfo?.groupName}
        {groupInfo?.memberCount != null && `（メンバー ${groupInfo.memberCount}人）`}
      </div>
    );
  }
  if (status === "not_joined") {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 text-[11px] mt-1">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        ボットがこのグループに参加していません
      </div>
    );
  }
  if (status === "format_error") {
    return (
      <div className="flex items-center gap-1.5 text-destructive text-[11px] mt-1">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        グループIDの形式が正しくありません（「C」で始まる33文字）
      </div>
    );
  }
  return null;
}

export default function LineNotifySettings({ eventId, event }) {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [groupStatus, setGroupStatus] = useState(null); // null | 'checking' | 'ok' | 'not_joined' | 'format_error'
  const [groupInfo, setGroupInfo] = useState(null);
  const [showDetected, setShowDetected] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (event) {
      setEnabled(Boolean(event.line_notify_enabled));
      setGroupId(event.line_group_id || "");
    }
  }, [event?.id]);

  // 検知済みグループ一覧
  const { data: detectedGroups = [], refetch: refetchDetected } = useQuery({
    queryKey: ["detectedLineGroups"],
    queryFn: () => base44.entities.DetectedLineGroup.list("-detected_at", 20),
    staleTime: 30000,
  });

  const checkGroupId = useCallback(async (id) => {
    if (!id.trim()) { setGroupStatus(null); setGroupInfo(null); return; }
    if (!isValidGroupIdFormat(id.trim())) {
      setGroupStatus("format_error");
      setGroupInfo(null);
      return;
    }
    setGroupStatus("checking");
    setGroupInfo(null);
    const res = await base44.functions.invoke("getLineGroupInfo", { groupId: id.trim() });
    const data = res.data;
    if (data?.groupName) {
      setGroupStatus("ok");
      setGroupInfo(data);
    } else {
      setGroupStatus("not_joined");
      setGroupInfo(null);
    }
  }, []);

  const handleGroupIdChange = (val) => {
    setGroupId(val);
    setGroupStatus(null);
    setGroupInfo(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkGroupId(val), 500);
  };

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

  const applyDetectedGroup = (g) => {
    setGroupId(g.group_id);
    setGroupStatus(null);
    setGroupInfo(null);
    setShowDetected(false);
    // debounceで検証
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkGroupId(g.group_id), 500);
  };

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
            onChange={(e) => handleGroupIdChange(e.target.value)}
            placeholder="C... で始まるグループID（33文字）"
            className="h-8 text-sm font-mono"
          />
          <GroupIdStatus status={groupStatus} groupInfo={groupInfo} />

          {/* 検知済みグループパネル */}
          <div className="mt-2">
            <button
              onClick={() => { setShowDetected((v) => !v); refetchDetected(); }}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              最近検知したグループ
              {detectedGroups.length > 0 && (
                <span className="ml-1 bg-primary/15 text-primary rounded px-1 py-0.5 text-[10px] font-semibold">{detectedGroups.length}</span>
              )}
            </button>

            {showDetected && (
              <div className="mt-1.5 space-y-1">
                {detectedGroups.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground px-1">
                    検知済みのグループはありません。LINEグループ内でボットに「登録」とメッセージを送ると自動登録されます。
                  </p>
                ) : (
                  detectedGroups.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{g.group_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">...{g.group_id.slice(-8)}</span>
                          {g.detected_at && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />
                              {format(new Date(g.detected_at), "M/d HH:mm", { locale: ja })}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 shrink-0"
                        onClick={() => applyDetectedGroup(g)}
                      >
                        設定する
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
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