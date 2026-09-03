import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOperationLog } from "@/hooks/useOperationLog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveSelect } from "@/components/ui/responsive-select";
import { X, CalendarClock } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

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
    continuous_mode: event?.continuous_mode || false,
    multi_show_mode: event?.multi_show_mode || false,
    show_count: event?.show_count || 1,
  });
  const [uploadingMap, setUploadingMap] = useState(false);
  const fileInputRef = useRef(null);

  const { data: venues = [] } = useQuery({
    queryKey: ["venues"],
    queryFn: () => base44.entities.Venue.list(),
  });
  const venueOptions = useMemo(() => venues.map((v) => ({ value: v.name, label: v.name })), [venues]);

  const timeOptions = useMemo(
    () =>
      Array.from({ length: 288 }, (_, i) => {
        const h = Math.floor(i / 12);
        const m = (i % 12) * 5;
        const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        return { value: val, label: val };
      }),
    []
  );

  const [venueMode, setVenueMode] = useState("select");
  const handleVenueModeChange = (mode) => {
    if (mode === venueMode) return;
    setVenueMode(mode);
    setForm((prev) => ({ ...prev, venue: "" }));
  };
  useEffect(() => {
    if (venueOptions.length === 0) setVenueMode("direct");
  }, [venueOptions.length]);

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
    prev.time_end !== cur.time_end ||
    prev.continuous_mode !== cur.continuous_mode ||
    prev.multi_show_mode !== cur.multi_show_mode ||
    prev.show_count !== cur.show_count;

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
      className="fixed inset-0 z-[100] h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90dvh] overflow-y-auto"
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
            <div className="flex items-center justify-between">
              <Label>会場名</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleVenueModeChange("select")}
                  disabled={venueOptions.length === 0}
                  className={`text-xs underline transition-colors ${venueMode === "select" ? "text-primary font-semibold" : "text-muted-foreground"} ${venueOptions.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  登録会場から選ぶ
                </button>
                <button
                  type="button"
                  onClick={() => handleVenueModeChange("direct")}
                  className={`text-xs underline transition-colors ${venueMode === "direct" ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  直接入力する
                </button>
              </div>
            </div>
            <div className="mt-1">
              {venueMode === "select" && venueOptions.length > 0 ? (
                <ResponsiveSelect
                  value={form.venue}
                  onValueChange={(val) => setForm({ ...form, venue: val })}
                  placeholder="会場を選択"
                  options={venueOptions}
                  label="会場名"
                />
              ) : (
                <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="例：〇〇アリーナ" />
              )}
            </div>
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
              <div className="grid grid-cols-[4rem_1fr_auto_1fr_auto] gap-1.5 items-center">
                <Label className="text-xs text-muted-foreground">先行</Label>
                <ResponsiveSelect value={form.time_priority} onValueChange={(val) => setForm({ ...form, time_priority: val })} placeholder="--:--" options={timeOptions} label="先行 開始時刻" />
                <button type="button" onClick={() => setForm({ ...form, time_priority: "" })} disabled={!form.time_priority} className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"><X className="w-3.5 h-3.5" /></button>
                <ResponsiveSelect value={form.time_priority_end} onValueChange={(val) => setForm({ ...form, time_priority_end: val })} placeholder="--:--" options={timeOptions} label="先行 終了時刻" />
                <button type="button" onClick={() => setForm({ ...form, time_priority_end: "" })} disabled={!form.time_priority_end} className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
              {/* 開場 - 開始のみ */}
              <div className="grid grid-cols-[4rem_1fr_auto] gap-1.5 items-center">
                <Label className="text-xs text-muted-foreground">開場</Label>
                <ResponsiveSelect value={form.time_open} onValueChange={(val) => setForm({ ...form, time_open: val })} placeholder="--:--" options={timeOptions} label="開場時刻" />
                <button type="button" onClick={() => setForm({ ...form, time_open: "" })} disabled={!form.time_open} className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
              {/* 開演 - 開始のみ */}
              <div className="grid grid-cols-[4rem_1fr_auto] gap-1.5 items-center">
                <Label className="text-xs text-muted-foreground">開演</Label>
                <ResponsiveSelect value={form.time_start} onValueChange={(val) => setForm({ ...form, time_start: val })} placeholder="--:--" options={timeOptions} label="開演時刻" />
                <button type="button" onClick={() => setForm({ ...form, time_start: "" })} disabled={!form.time_start} className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
              {/* 終演 - 開始のみ */}
              <div className="grid grid-cols-[4rem_1fr_auto] gap-1.5 items-center">
                <Label className="text-xs text-muted-foreground">終演</Label>
                <ResponsiveSelect value={form.time_end} onValueChange={(val) => setForm({ ...form, time_end: val })} placeholder="--:--" options={timeOptions} label="終演時刻" />
                <button type="button" onClick={() => setForm({ ...form, time_end: "" })} disabled={!form.time_end} className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
          <div>
            <Label>備考</Label>
            <Input className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="メモなど" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex items-start gap-2">
              <CalendarClock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <Label className="cursor-pointer">一日通しモード</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                  時間帯区分（開場中・開演中・終演後）を廃止し、一日通して同じポジションで管理します。大型フェス等に適しています。
                </p>
              </div>
            </div>
            <Switch
              checked={form.continuous_mode}
              onCheckedChange={(checked) => setForm({ ...form, continuous_mode: checked, multi_show_mode: checked ? false : form.multi_show_mode })}
            />
          </div>
          <div className="rounded-lg border border-border p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <CalendarClock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <Label className="cursor-pointer">複数公演モード</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    同一日の複数公演（1部・2部・3部…）を各部ごとに開場中・開演中・終演後で管理します。各部は配置表から切り替えられます。
                  </p>
                </div>
              </div>
              <Switch
                checked={form.multi_show_mode}
                onCheckedChange={(checked) => setForm({ ...form, multi_show_mode: checked, continuous_mode: checked ? false : form.continuous_mode })}
              />
            </div>
            {form.multi_show_mode && (
              <div className="flex items-center gap-2 pl-6">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">公演回数（部数）</Label>
                <div className="flex items-center border border-border rounded-md overflow-hidden">
                  <button type="button" onClick={() => setForm({ ...form, show_count: Math.max(2, (form.show_count || 2) - 1) })} className="flex h-7 w-7 items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 sm:h-6 sm:w-6">−</button>
                  <span className="w-8 text-center text-sm font-semibold">{form.show_count || 2}</span>
                  <button type="button" onClick={() => setForm({ ...form, show_count: (form.show_count || 2) + 1 })} className="flex h-7 w-7 items-center justify-center bg-muted text-muted-foreground hover:bg-muted/80 sm:h-6 sm:w-6">+</button>
                </div>
                <span className="text-[10px] text-muted-foreground">部（あとから増減可能）</span>
              </div>
            )}
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