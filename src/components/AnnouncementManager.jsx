import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Bell, Plus, Trash2, AlertTriangle,
  ShieldAlert, Send, X, ChevronDown, ChevronUp, Megaphone, Paperclip, FileText, Pencil
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { useOperationLog } from "@/hooks/useOperationLog";
import SectionHeader from "@/components/SectionHeader";

const PRIORITY_STYLES = {
  "通常": { badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700", icon: Bell },
  "重要": { badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700", icon: AlertTriangle },
  "緊急": { badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700", icon: ShieldAlert },
};

function AnnouncementForm({ eventId, onClose, onSaved, onRecord }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: "", body: "", priority: "通常", target_staff: [], is_alert: false,
  });
  const [attachedFiles, setAttachedFiles] = useState([]); // [{name, url}]
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke("updateAnnouncementRecord", { action: "create", data });
      return res?.data?.announcement;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["announcements", eventId] });
      await queryClient.cancelQueries({ queryKey: ["announcements-alert", eventId] });
      const previousAnnouncements = queryClient.getQueryData(["announcements", eventId]);
      const previousAlert = queryClient.getQueryData(["announcements-alert", eventId]);
      const optimisticId = `temp-announcement-${Date.now()}`;
      const optimisticAnnouncement = {
        ...data,
        id: optimisticId,
        created_date: new Date().toISOString(),
      };
      queryClient.setQueryData(["announcements", eventId], (old = []) => [optimisticAnnouncement, ...old]);
      if (data.is_alert) {
        queryClient.invalidateQueries({ queryKey: ["announcements-alert", eventId] });
      }
      return { previousAnnouncements, previousAlert, optimisticId };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(["announcements", eventId], context?.previousAnnouncements);
      queryClient.setQueryData(["announcements-alert", eventId], context?.previousAlert);
      toast.error("送信に失敗しました: " + (err?.message || "権限がないか、エラーが発生しました"));
      onSaved(); // close dialog even on error
    },
    onSuccess: (createdAnnouncement, data, context) => {
      if (createdAnnouncement?.id) {
        queryClient.setQueryData(["announcements", eventId], (old = []) =>
          old.map((item) => item.id === context?.optimisticId ? createdAnnouncement : item)
        );
        onRecord?.({ action_type: "announcement_create", description: `連絡事項「${data.title}」を作成しました`, entity_type: "Announcement", entity_id: createdAnnouncement.id });
      } else {
        queryClient.invalidateQueries({ queryKey: ["announcements", eventId] });
      }
      queryClient.invalidateQueries({ queryKey: ["announcements", eventId] });
      queryClient.invalidateQueries({ queryKey: ["announcements-alert", eventId] });
      toast.success("連絡事項を送信しました");
      onSaved();
    },
  });

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { name: file.name, url: file_url };
      })
    );
    setAttachedFiles((prev) => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = "";
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    createMutation.mutate({
      ...form,
      event_id: eventId,
      target_staff: [],
      read_by: [],
      file_urls: attachedFiles.map((f) => f.url),
    });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-2 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
    <motion.div
      className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl h-[90vh] sm:h-auto flex flex-col"
      initial={{ y: 36, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />連絡事項を作成
        </h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="閉じる">
          <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">優先度</label>
            <div className="flex gap-2">
              {["通常", "重要", "緊急"].map((p) => {
                const s = PRIORITY_STYLES[p];
                return (
                  <button
                    key={p}
                    onClick={() => setForm((prev) => ({ ...prev, priority: p, is_alert: p !== "通常" ? true : false }))}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      form.priority === p ? s.badge + " ring-2 ring-offset-1 ring-current" : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">件名 *</label>
            <input
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="例：入場ゲート変更のお知らせ"
              data-testid="announcement-title-input"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">本文</label>
            <textarea
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="詳細内容を入力..."
              rows={3}
              data-testid="announcement-body-input"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            />
          </div>

          {/* Alert banner toggle */}
          <div
            onClick={() => setForm((prev) => ({ ...prev, is_alert: !prev.is_alert }))}
            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
              form.is_alert ? "bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700" : "bg-muted border-border"
            }`}
          >
            <div className={`w-9 h-5 rounded-full flex items-center transition-all ${form.is_alert ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${form.is_alert ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <div>
              <div className="text-xs font-semibold">アラートバナー表示</div>
              <div className="text-[10px] text-muted-foreground">ページ上部に緊急通知として表示</div>
            </div>
          </div>

          {/* File attachment */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ファイル添付</label>
            <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors text-muted-foreground cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" />
              {uploading ? "アップロード中..." : "ファイルを選択"}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                data-testid="announcement-file-input"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>
            {attachedFiles.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-2 py-1">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
        <div className="px-3 py-2 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button
            className="flex-1 gap-1"
            data-testid="announcement-submit-button"
            disabled={!form.title.trim() || createMutation.isPending || uploading}
            onClick={handleSubmit}
          >
            <Send className="w-3.5 h-3.5" />送信
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnnouncementEditForm({ ann, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: ann.title,
    body: ann.body || "",
    priority: ann.priority || "通常",
    is_alert: ann.is_alert || false,
  });
  const [attachedFiles, setAttachedFiles] = useState((ann.file_urls || []).map((url) => ({ name: url.split("/").pop().split("?")[0], url })));
  const [uploading, setUploading] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await base44.functions.invoke("updateAnnouncementRecord", { action: "update", announcementId: ann.id, data });
      return res?.data?.announcement;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["announcements", ann.event_id] });
      await queryClient.cancelQueries({ queryKey: ["announcements-alert", ann.event_id] });
      const previousAnnouncements = queryClient.getQueryData(["announcements", ann.event_id]);
      const previousAlert = queryClient.getQueryData(["announcements-alert", ann.event_id]);
      queryClient.setQueryData(["announcements", ann.event_id], (old = []) =>
        old.map((item) => item.id === ann.id ? { ...item, ...data } : item)
      );
      return { previousAnnouncements, previousAlert };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["announcements", ann.event_id], context?.previousAnnouncements);
      queryClient.setQueryData(["announcements-alert", ann.event_id], context?.previousAlert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", ann.event_id] });
      queryClient.invalidateQueries({ queryKey: ["announcements-alert", ann.event_id] });
      onSaved();
    },
  });

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const uploaded = await Promise.all(files.map(async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return { name: file.name, url: file_url };
    }));
    setAttachedFiles((prev) => [...prev, ...uploaded]);
    setUploading(false);
    e.target.value = "";
  };

  const handleSubmit = () => {
    if (!form.title.trim()) return;
    updateMutation.mutate({
      ...form,
      target_staff: [],
      file_urls: attachedFiles.map((f) => f.url),
    });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-2 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl h-[90vh] sm:h-auto flex flex-col"
        initial={{ y: 36, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h3 className="font-bold text-base flex items-center gap-2"><Pencil className="w-4 h-4 text-primary" />連絡事項を編集</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground" aria-label="閉じる"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3 space-y-2 flex-1 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">優先度</label>
            <div className="flex gap-2">
              {["通常", "重要", "緊急"].map((p) => {
                const s = PRIORITY_STYLES[p];
                return (
                  <button key={p} onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${form.priority === p ? s.badge + " ring-2 ring-offset-1 ring-current" : "bg-muted border-border text-muted-foreground"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">件名 *</label>
            <input className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">本文</label>
            <textarea className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} />
          </div>
          <div onClick={() => setForm((prev) => ({ ...prev, is_alert: !prev.is_alert }))} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${form.is_alert ? "bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700" : "bg-muted border-border"}`}>
            <div className={`w-9 h-5 rounded-full flex items-center transition-all ${form.is_alert ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600"}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${form.is_alert ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <div><div className="text-xs font-semibold">アラートバナー表示</div></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ファイル添付</label>
            <label className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors text-muted-foreground cursor-pointer">
              <Paperclip className="w-3.5 h-3.5" />{uploading ? "アップロード中..." : "ファイルを選択"}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                data-testid="announcement-file-input-edit"
                disabled={uploading}
                onChange={handleFileChange}
              />
            </label>
            {attachedFiles.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-card border border-border rounded-lg px-2 py-1">
                    <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-3 py-2 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button className="flex-1 gap-1" disabled={!form.title.trim() || updateMutation.isPending} onClick={handleSubmit}>
            <Send className="w-3.5 h-3.5" />保存
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnnouncementCard({ ann, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const style = PRIORITY_STYLES[ann.priority] || PRIORITY_STYLES["通常"];
  const Icon = style.icon;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-start gap-2 px-2.5 py-1.5">
        <div className={`mt-0.5 p-1 rounded-lg border ${style.badge}`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${style.badge}`}>{ann.priority}</span>

            <span className="text-xs font-semibold truncate">{ann.title}</span>
          </div>
          {ann.body && (
            <p className={`text-xs text-muted-foreground mt-0.5 ${expanded ? "" : "line-clamp-1"}`}>{ann.body}</p>
          )}
          {(ann.file_urls || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {ann.file_urls.map((url, i) => {
                const fileName = url.split("/").pop().split("?")[0] || `添付${i + 1}`;
                return (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                    <Paperclip className="w-2.5 h-2.5" />{fileName}
                  </a>
                );
              })}
            </div>
          )}

        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => setShowEdit(true)} className="p-1 rounded hover:bg-primary/10 hover:text-primary text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="編集">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {ann.body && (
            <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={expanded ? "閉じる" : "詳細を表示"}>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title="削除">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showEdit && (
        <AnnouncementEditForm
          ann={ann}
          onClose={() => setShowEdit(false)}
          onSaved={() => setShowEdit(false)}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmDialog
          message="この連絡事項を削除しますか？"
          confirmLabel="削除"
          onConfirm={() => { onDelete(ann); setShowDeleteConfirm(false); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

export default function AnnouncementManager({ eventId }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const prevIdsRef = useRef(new Set());
  const { role, canEdit } = useUserRole();
  const { record } = useOperationLog(eventId);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements", eventId],
    queryFn: () => base44.entities.Announcement.filter({ event_id: eventId }),
    select: (d) => d.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  // Fire browser notification for new announcements
  useEffect(() => {
    if (!announcements.length) return;
    const currentIds = new Set(announcements.map((a) => a.id));
    if (prevIdsRef.current.size === 0) {
      // Initial load — just record ids, don't notify
      prevIdsRef.current = currentIds;
      return;
    }
    const newItems = announcements.filter((a) => !prevIdsRef.current.has(a.id));
    if (newItems.length > 0 && "Notification" in window && Notification.permission === "granted") {
      newItems.forEach((a) => {
        new Notification(`📢 新着連絡: ${a.title}`, {
          body: a.body || "",
          icon: "/favicon.ico",
        });
      });
    }
    prevIdsRef.current = currentIds;
  }, [announcements]);

  const deleteMutation = useMutation({
    mutationFn: async (ann) => {
      record({ action_type: "announcement_delete", description: `連絡事項「${ann.title}」を削除しました`, entity_type: "Announcement", entity_id: ann.id });
      await base44.functions.invoke("updateAnnouncementRecord", { action: "delete", announcementId: ann.id });
    },
    onMutate: async (ann) => {
      await queryClient.cancelQueries({ queryKey: ["announcements", eventId] });
      await queryClient.cancelQueries({ queryKey: ["announcements-alert", eventId] });
      const previousAnnouncements = queryClient.getQueryData(["announcements", eventId]);
      const previousAlert = queryClient.getQueryData(["announcements-alert", eventId]);
      queryClient.setQueryData(["announcements", eventId], (old = []) => old.filter((item) => item.id !== ann.id));
      return { previousAnnouncements, previousAlert };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["announcements", eventId], context?.previousAnnouncements);
      queryClient.setQueryData(["announcements-alert", eventId], context?.previousAlert);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements", eventId] });
      queryClient.invalidateQueries({ queryKey: ["announcements-alert", eventId] });
    },
  });

  return (
    <div>
      <SectionHeader
        icon={Megaphone}
        title="連絡事項"
        actions={role !== null && canEdit && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-1 h-8 text-xs px-2">
            <Plus className="w-3 h-3" />新規作成
          </Button>
        )}
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm font-medium">連絡事項はありません</p>
          <p className="text-xs mt-1">「新規作成」で連絡通知を追加できます</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {announcements.map((ann) => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              onDelete={(ann) => deleteMutation.mutate(ann)}
            />
          ))}
        </div>
      )}

      {showForm && role !== null && canEdit && (
        <AnnouncementForm
          eventId={eventId}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
          onRecord={record}
        />
      )}
    </div>
  );
}
