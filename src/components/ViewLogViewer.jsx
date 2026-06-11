import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Eye, ChevronDown, ChevronUp, Trash2, FileText, Bell, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";

const VIEW_TYPE_META = {
  announcement_open: {
    label: "連絡閲覧",
    color: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700",
    icon: Bell,
  },
  file_open: {
    label: "ファイル閲覧",
    color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
    icon: FileText,
  },
  tab_open: {
    label: "タブ閲覧",
    color: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
    icon: Folder,
  },
  item_expand: {
    label: "詳細展開",
    color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
    icon: Eye,
  },
};

function ViewLogEntry({ log }) {
  const meta = VIEW_TYPE_META[log.view_type] || {
    label: log.view_type,
    color: "bg-slate-100 text-slate-700 border-slate-300",
    icon: Eye,
  };
  const Icon = meta.icon;
  const timeStr = log.created_date
    ? format(new Date(log.created_date), "M/d(E) HH:mm", { locale: ja })
    : "";

  return (
    <div className="px-2.5 py-1.5">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${meta.color}`}>
              <Icon className="w-2.5 h-2.5" />
              {meta.label}
            </span>
            <span className="text-xs font-medium truncate">{log.target_title}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {log.actor_name && (
              <span className="text-[10px] text-muted-foreground font-medium">👤 {log.actor_name}</span>
            )}
            <span className="text-[10px] text-muted-foreground">🕐 {timeStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ViewLogViewer({ eventId }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["viewLogs", eventId],
    queryFn: () => base44.entities.ViewLog.filter({ event_id: eventId }, "-created_date", 200),
    enabled: expanded,
    refetchInterval: expanded ? 15000 : false,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const all = await base44.entities.ViewLog.filter({ event_id: eventId });
      await Promise.all(all.map((l) => base44.entities.ViewLog.delete(l.id)));
    },
    onSuccess: () => {
      toast.success("閲覧ログを削除しました");
      queryClient.invalidateQueries({ queryKey: ["viewLogs", eventId] });
      setConfirmClear(false);
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  return (
    <div className="mt-2 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-2.5 py-2 bg-muted/50 hover:bg-muted/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-teal-500" />
          <span className="text-xs font-bold">閲覧ログ</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">ログがありません</p>
              ) : (
                <>
                  <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
                    {logs.map((log) => (
                      <ViewLogEntry key={log.id} log={log} />
                    ))}
                  </div>
                  <div className="border-t border-border px-2.5 py-1.5 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmClear(true)}
                      disabled={clearMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />ログをすべて削除
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmClear && (
        <ConfirmDialog
          message="閲覧ログをすべて削除しますか？\nこの操作は取り消せません。"
          confirmLabel="削除する"
          onConfirm={() => clearMutation.mutate()}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  );
}