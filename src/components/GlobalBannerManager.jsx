import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Trash2, Send } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

export default function GlobalBannerManager() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: configs = [] } = useQuery({
    queryKey: ["appConfig", "global_banner_message"],
    queryFn: () => base44.entities.AppConfig.filter({ key: "global_banner_message" }, null, 1),
  });

  const existing = configs?.[0];

  useEffect(() => {
    if (existing?.value) setMessage(existing.value);
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        await base44.entities.AppConfig.update(existing.id, { value: message });
      } else {
        await base44.entities.AppConfig.create({ key: "global_banner_message", value: message });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appConfig"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.AppConfig.delete(existing.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appConfig"] });
      setMessage("");
    },
  });

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={AlertTriangle}
        title="グローバル通知"
        subtitle="イベント一覧・詳細ページ上部に表示されるバナーメッセージです"
      />
      <Textarea
        placeholder="通知メッセージを入力..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="text-sm resize-none"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={!message.trim() || saveMutation.isPending}
        >
          <Send className="w-3 h-3" />
          {existing ? "更新" : "送信"}
        </Button>
        {existing && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-3 h-3" />削除
          </Button>
        )}
      </div>
    </div>
  );
}