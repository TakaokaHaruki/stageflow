import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOperationLog } from "@/hooks/useOperationLog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { motion } from "framer-motion";

export default function EventFormModal({ event, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const { record } = useOperationLog(event?.id);
  const [form, setForm] = useState({
    name: event?.name || "",
    date: event?.date || "",
    venue: event?.venue || "",
    description: event?.description || "",
    map_image_url: event?.map_image_url || "",
    time_priority: event?.time_priority || "",
    time_priority_end: event?.time_priority_end || "",
    time_open: event?.time_open || "",
    time_start: event?.time_start || "",
    time_end: event?.time_end || "",
  });
  const [uploadingMap, setUploadingMap] = useState(false);
  const fileInputRef = useRef(null);

  const handleMapUpload = async (file) => {
    if (!file) return;
    setUploadingMap(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm((prev) => ({ ...prev, map_image_url: res?.file_url || "" }));
    } catch {
      toast.error("画像のアップロードに失敗しました");
    } finally {
      setUploadingMap(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Auto-populate end times: 開場終了=開演開始, 開演終了=終演開始
      const payload = {
        ...data,
        time_open_end: data.time_start || "",
        time_start_end: data.time_end || "",
      };
      if (event) {
        const res = await base44.functions.invoke("updateEventRecord", { eventId: event.id, data: payload });
        return res?.data?.event ?? null;
      }
      return base44.entities.Event.create(payload);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      if (event) await queryClient.cancelQueries({ queryKey: ["event", event.id] });
      const previousEvents = queryClient.getQueryData(["events"]);
      const previousEvent = event ? queryClient.getQueryData(["event", event.id]) : undefined;
      const optimisticId = event?.id || `temp-event-${Date.now()}`;
      const optimisticEvent = { ...(event || {}), ...data, id: optimisticId };

      queryClient.setQueryData(["events"], (old = []) => {
        if (event) return old.map((item) => item.id === event.id ? { ...item, ...data } : item);
        return [optimisticEvent, ...old];
      });
      if (event) queryClient.setQueryData(["event", event.id], optimisticEvent);

      return { previousEvents, previousEvent, optimisticId };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["events"], context?.previousEvents);
      if (event) queryClient.setQueryData(["event", event.id], context?.previousEvent);
      toast.error(event ? "保存に失敗しました" : "作成に失敗しました");
    },
    onSuccess: (savedEvent, __, context) => {
      if (!event && savedEvent?.id) {
        queryClient.setQueryData(["events"], (old = []) =>
          old.map((item) => item.id === context?.optimisticId ? savedEvent : item)
        );
      }
      onSaved?.();
    },
  });

  // Auto-save: text fields (name, venue, description) → 500ms, others (date, status) → instant
  const prevFormRef = useRef(form);
  const isTextChange = (prev, cur) =>
    prev.name !== cur.name || prev.venue !== cur.venue || prev.description !== cur.description;
  const isNonTextChange = (prev, cur) =>
    prev.date !== cur.date ||
    prev.map_image_url !== cur.map_image_url ||
    prev.time_priority !== cur.time_priority || prev.time_priority_end !== cur.time_priority_end ||
    prev.time_open !== cur.time_open ||
    prev.time_start !== cur.time_start ||
    prev.time_end !== cur.time_end;

  useEffect(() => {
    if (!event || !form.name) return;
    const prev = prevFormRef.current;
    const textChanged = isTextChange(prev, form);
    const nonTextChanged = isNonTextChange(prev, form);
    if (!textChanged && !nonTextChanged) return;

    const delay = nonTextChanged ? 0 : 500;
    const timer = setTimeout(() => {
      const before = prevFormRef.current;
      mutation.mutate(form, {
        onSuccess: () => {
          toast.success("保存しました");
          record({ action_type: "event_update", description: `イベント「${form.name}」を更新しました`, entity_type: "Event", entity_id: event.id, snapshot_before: before, snapshot_after: form });
          prevFormRef.current = form;
        }
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [form]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4 max-h-[92vh] overflow-y-auto"
        initial={{ y: 32, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">{event ? "イベント編集" : "新規イベント"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <Label>イベント名 *</Label>
            <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例：〇〇コンサート2026" />
          </div>
          <div>
            <Label>開催日</Label>
            <Input
              className="mt-1 w-full"
              type="date"
              value={form.date}
              min="2000-01-01"
              max="2099-12-31"
              onChange={(e) => {
                const val = e.target.value;
                if (!val) { setForm({ ...form, date: "" }); return; }
                const year = parseInt(val.split("-")[0], 10);
                if (year >= 2000 && year <= 2099) {
                  setForm({ ...form, date: val });
                }
              }}
            />
          </div>
          <div>
            <Label>会場名</Label>
            <Input className="mt-1" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="例：〇〇アリーナ" />
          </div>
          {event && (
            <div>
              <Label>会場マップ画像</Label>
              <div className="mt-1 space-y-2">
                {form.map_image_url && (
                  <img src={form.map_image_url} alt="会場マップ" className="w-full rounded-lg border border-border" />
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMapUpload(f); e.target.value = ""; }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                    disabled={uploadingMap}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingMap ? "アップロード中..." : form.map_image_url ? "画像を変更" : "画像をアップロード"}
                  </Button>
                  {form.map_image_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive"
                      onClick={() => setForm({ ...form, map_image_url: "" })}
                    >
                      削除
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div>
            <Label>時間設定</Label>
            <div className="mt-1 space-y-2">
              {/* 先行 - 開始・終了あり */}
              <div className="grid grid-cols-[4rem_1fr_1fr] gap-2 items-center">
                <Label className="text-xs text-muted-foreground">先行</Label>
                <Input type="time" className="w-full" value={form.time_priority} onChange={(e) => setForm({ ...form, time_priority: e.target.value })} />
                <Input type="time" className="w-full" value={form.time_priority_end} onChange={(e) => setForm({ ...form, time_priority_end: e.target.value })} />
              </div>
              {/* 開場 - 開始のみ */}
              <div className="grid grid-cols-[4rem_1fr] gap-2 items-center">
                <Label className="text-xs text-muted-foreground">開場</Label>
                <Input type="time" className="w-full" value={form.time_open} onChange={(e) => setForm({ ...form, time_open: e.target.value })} />
              </div>
              {/* 開演 - 開始のみ */}
              <div className="grid grid-cols-[4rem_1fr] gap-2 items-center">
                <Label className="text-xs text-muted-foreground">開演</Label>
                <Input type="time" className="w-full" value={form.time_start} onChange={(e) => setForm({ ...form, time_start: e.target.value })} />
              </div>
              {/* 終演 - 開始のみ */}
              <div className="grid grid-cols-[4rem_1fr] gap-2 items-center">
                <Label className="text-xs text-muted-foreground">終演</Label>
                <Input type="time" className="w-full" value={form.time_end} onChange={(e) => setForm({ ...form, time_end: e.target.value })} />
              </div>
            </div>
          </div>
          <div>
            <Label>備考</Label>
            <Input className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="メモなど" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>閉じる</Button>
          {!event && (
            <Button
              className="flex-1"
              disabled={!form.name || mutation.isPending}
              onClick={() => mutation.mutate(form, {
                onSuccess: () => {
                  toast.success("作成しました");
                  setTimeout(onClose, 500);
                }
              })}
            >
              {mutation.isPending ? "作成中..." : "作成"}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}