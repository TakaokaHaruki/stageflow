import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import DetectedGroupList from "@/components/DetectedGroupList";

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
    <div className="bg-card border border-border rounded-lg px-2.5 py-2 mb-2">
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
              onClick={() => setShowDetected((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              最近検知したグループ
            </button>

            {showDetected && (
              <div className="mt-1.5">
                <DetectedGroupList
                  currentEventId={eventId}
                  onApply={applyDetectedGroup}
                />
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