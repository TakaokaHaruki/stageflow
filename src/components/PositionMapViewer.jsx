import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, ImageOff, Pencil, Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import PositionMapEditor from "@/components/PositionMapEditor";
import { toast } from "sonner";

export default function PositionMapViewer({ eventId, event }) {
  const { canEdit } = useUserRole();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["positions", eventId],
    queryFn: () => base44.entities.Position.filter({ event_id: eventId }),
  });

  const handleMapUpload = useCallback(async (file) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = res?.file_url;
      if (!fileUrl) throw new Error("アップロードに失敗しました");
      await base44.functions.invoke("updateEventRecord", {
        eventId,
        data: { map_image_url: fileUrl },
      });
      await queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("マップ画像を更新しました");
    } catch {
      toast.error("マップ画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }, [eventId, uploading, queryClient]);

  const handleMapDelete = useCallback(async () => {
    if (uploading) return;
    setUploading(true);
    try {
      await base44.functions.invoke("updateEventRecord", {
        eventId,
        data: { map_image_url: "" },
      });
      await queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("マップ画像を削除しました");
    } catch {
      toast.error("マップ画像の削除に失敗しました");
    } finally {
      setUploading(false);
    }
  }, [eventId, uploading, queryClient]);

  if (!event?.map_image_url) {
    if (canEdit) {
      return (
        <div className="space-y-3">
          <div
            className={`flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleMapUpload(f); }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <ImageIcon className="h-6 w-6 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">会場マップ画像をアップロード</p>
              <p className="mt-1 text-xs text-muted-foreground">PNG / JPEG / WebP に対応</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMapUpload(f); e.target.value = ""; }}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "アップロード中..." : "画像を選択"}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <ImageOff className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium">マップ画像が設定されていません</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (editMode && canEdit) {
    return <PositionMapEditor eventId={eventId} event={event} onExit={() => setEditMode(false)} />;
  }

  const pins = [];
  positions.forEach((pos) => {
    if (pos.split_by_side) {
      if (pos.map_x_kamite != null && pos.map_y_kamite != null) {
        pins.push({ id: pos.id, name: pos.name, time_slot: pos.time_slot, color: pos.color, side: "上手", x: pos.map_x_kamite, y: pos.map_y_kamite, staff: pos.staff_names_kamite || [] });
      }
      if (pos.map_x_shimote != null && pos.map_y_shimote != null) {
        pins.push({ id: pos.id, name: pos.name, time_slot: pos.time_slot, color: pos.color, side: "下手", x: pos.map_x_shimote, y: pos.map_y_shimote, staff: pos.staff_names_shimote || [] });
      }
    } else if (pos.map_x != null && pos.map_y != null) {
      pins.push({ id: pos.id, name: pos.name, time_slot: pos.time_slot, color: pos.color, side: null, x: pos.map_x, y: pos.map_y, staff: pos.staff_names || [] });
    }
  });

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex flex-wrap justify-end gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMapUpload(f); e.target.value = ""; }}
          />
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            {uploading ? "処理中..." : "画像を変更"}
          </Button>
          <Button size="sm" variant="ghost" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={handleMapDelete} disabled={uploading}>
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditMode(true)}>
            <Pencil className="h-3.5 w-3.5" />ピン編集
          </Button>
        </div>
      )}
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card">
        <img
          src={event.map_image_url}
          alt="配置マップ"
          className="block w-full h-auto select-none"
          draggable={false}
        />
        {pins.map((pin, idx) => {
          const isSelected = selectedPin && selectedPin.id === pin.id && selectedPin.side === pin.side;
          const color = pin.color || "#6366f1";
          const pinKey = `${pin.id}-${pin.side || "main"}-${idx}`;
          return (
            <div key={pinKey}>
              <button
                onClick={() => setSelectedPin(isSelected ? null : pin)}
                className="absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                aria-label={`${pin.name}${pin.side ? ` ${pin.side}` : ""}`}
              >
                <div className="flex flex-col items-center">
                  <span className="mb-0.5 rounded bg-card/90 px-1 py-0.5 text-[10px] font-semibold shadow-sm whitespace-nowrap" style={{ color }}>
                    {pin.name}{pin.side && `(${pin.side})`}
                  </span>
                  <MapPin className="h-6 w-6 drop-shadow-md" style={{ color, fill: color }} />
                </div>
              </button>
              {isSelected && (
                <div
                  className="absolute z-20 w-44 -translate-x-1/2 rounded-lg border border-border bg-card p-2 shadow-xl"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, marginTop: "1.75rem" }}
                >
                  <p className="text-xs font-bold" style={{ color }}>{pin.name}</p>
                  {pin.side && <p className="text-[10px] text-muted-foreground">{pin.side}</p>}
                  {pin.time_slot && <p className="text-[10px] text-muted-foreground">{pin.time_slot}</p>}
                  <div className="mt-1 border-t border-border pt-1">
                    <p className="text-[10px] font-semibold text-foreground">担当スタッフ</p>
                    {pin.staff.length > 0 ? (
                      <ul className="mt-0.5 space-y-0.5">
                        {pin.staff.map((name, i) => (
                          <li key={i} className="text-[10px] text-foreground">{name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">未割当</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pins.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">ピンが設定されたポジションがありません。</p>
      )}
    </div>
  );
}