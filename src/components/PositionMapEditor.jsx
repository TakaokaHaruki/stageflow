import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIME_SLOTS, TIME_SLOT_STYLES } from "@/lib/constants";

export default function PositionMapEditor({ eventId, event, onExit }) {
  const queryClient = useQueryClient();
  const imgRef = useRef(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [draggingPin, setDraggingPin] = useState(null);

  const { data: positions = [] } = useQuery({
    queryKey: ["positions", eventId],
    queryFn: () => base44.entities.Position.filter({ event_id: eventId }),
  });

  const targetKey = (t) => `${t.positionId}-${t.side || "main"}`;

  const savePin = useCallback((positionId, side, x, y) => {
    const data =
      side === "kamite" ? { map_x_kamite: x, map_y_kamite: y }
      : side === "shimote" ? { map_x_shimote: x, map_y_shimote: y }
      : { map_x: x, map_y: y };
    queryClient.setQueryData(["positions", eventId], (old = []) =>
      old.map((p) => (p.id === positionId ? { ...p, ...data } : p))
    );
    base44.functions.invoke("updatePositionSide", {
      action: "updatePositionFields",
      positionId,
      data,
    });
  }, [queryClient, eventId]);

  const deletePin = useCallback((positionId, side) => {
    const data =
      side === "kamite" ? { map_x_kamite: null, map_y_kamite: null }
      : side === "shimote" ? { map_x_shimote: null, map_y_shimote: null }
      : { map_x: null, map_y: null };
    queryClient.setQueryData(["positions", eventId], (old = []) =>
      old.map((p) => (p.id === positionId ? { ...p, ...data } : p))
    );
    base44.functions.invoke("updatePositionSide", {
      action: "updatePositionFields",
      positionId,
      data,
    });
  }, [queryClient, eventId]);

  const getCoords = (clientX, clientY) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleMapClick = (e) => {
    if (draggingPin || !selectedTarget) return;
    const { x, y } = getCoords(e.clientX, e.clientY);
    savePin(selectedTarget.positionId, selectedTarget.side, x, y);
  };

  useEffect(() => {
    if (!draggingPin) return;
    const handleMove = (e) => {
      const { x, y } = getCoords(e.clientX, e.clientY);
      const data =
        draggingPin.side === "kamite" ? { map_x_kamite: x, map_y_kamite: y }
        : draggingPin.side === "shimote" ? { map_x_shimote: x, map_y_shimote: y }
        : { map_x: x, map_y: y };
      queryClient.setQueryData(["positions", eventId], (old = []) =>
        old.map((p) => (p.id === draggingPin.positionId ? { ...p, ...data } : p))
      );
    };
    const handleUp = (e) => {
      const { x, y } = getCoords(e.clientX, e.clientY);
      savePin(draggingPin.positionId, draggingPin.side, x, y);
      setDraggingPin(null);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingPin, eventId, queryClient, savePin]);

  // Build selectable pin targets grouped by time slot
  const pinTargets = [];
  positions.forEach((pos) => {
    const slot = pos.time_slot || "開場中";
    const color = pos.color || "#6366f1";
    if (pos.split_by_side) {
      pinTargets.push({ positionId: pos.id, side: "kamite", sideLabel: "上手", name: pos.name, time_slot: slot, color, hasPin: pos.map_x_kamite != null && pos.map_y_kamite != null });
      pinTargets.push({ positionId: pos.id, side: "shimote", sideLabel: "下手", name: pos.name, time_slot: slot, color, hasPin: pos.map_x_shimote != null && pos.map_y_shimote != null });
    } else {
      pinTargets.push({ positionId: pos.id, side: null, sideLabel: null, name: pos.name, time_slot: slot, color, hasPin: pos.map_x != null && pos.map_y != null });
    }
  });

  // Build renderable pins
  const pins = [];
  positions.forEach((pos) => {
    const color = pos.color || "#6366f1";
    const slot = pos.time_slot || "開場中";
    if (pos.split_by_side) {
      if (pos.map_x_kamite != null && pos.map_y_kamite != null)
        pins.push({ positionId: pos.id, side: "kamite", sideLabel: "上手", name: pos.name, time_slot: slot, color, x: pos.map_x_kamite, y: pos.map_y_kamite });
      if (pos.map_x_shimote != null && pos.map_y_shimote != null)
        pins.push({ positionId: pos.id, side: "shimote", sideLabel: "下手", name: pos.name, time_slot: slot, color, x: pos.map_x_shimote, y: pos.map_y_shimote });
    } else if (pos.map_x != null && pos.map_y != null) {
      pins.push({ positionId: pos.id, side: null, sideLabel: null, name: pos.name, time_slot: slot, color, x: pos.map_x, y: pos.map_y });
    }
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <AlertCircle className="h-3.5 w-3.5" />
          ピン位置編集中
        </div>
        <Button size="sm" className="gap-1 text-xs h-7" onClick={onExit}>
          <Check className="h-3.5 w-3.5" />完了
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Position selection list */}
        <div className="sm:w-56 sm:shrink-0">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">ポジションを選択</p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-1.5 sm:max-h-96">
            {TIME_SLOTS.map((slot) => {
              const slotTargets = pinTargets.filter((t) => t.time_slot === slot);
              if (slotTargets.length === 0) return null;
              return (
                <div key={slot} className="mb-2 last:mb-0">
                  <div className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${TIME_SLOT_STYLES[slot].badge}`}>
                    {slot}
                  </div>
                  <div className="space-y-1">
                    {slotTargets.map((t) => {
                      const selected = selectedTarget && targetKey(selectedTarget) === targetKey(t);
                      return (
                        <button
                          key={targetKey(t)}
                          onClick={() => setSelectedTarget(selected ? null : t)}
                          className={`flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : t.hasPin
                              ? "border-border bg-card text-foreground hover:bg-muted/50"
                              : "border-dashed border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                          {t.sideLabel && <span className="text-[10px] text-muted-foreground">{t.sideLabel}</span>}
                          {t.hasPin ? (
                            <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
                          ) : (
                            <span className="text-[10px]">未設定</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {pinTargets.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">ポジションがありません</p>
            )}
          </div>
          {selectedTarget && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              「{selectedTarget.name}{selectedTarget.sideLabel ? `(${selectedTarget.sideLabel})` : ""}」を選択中。マップをクリックして配置、ピンをドラッグで移動、右クリックで削除できます。
            </p>
          )}
        </div>

        {/* Map with pins */}
        <div className="relative min-w-0 flex-1">
          <div className="relative w-full overflow-hidden rounded-lg border border-border bg-card">
            <img
              ref={imgRef}
              src={event.map_image_url}
              alt="配置マップ"
              className="block w-full h-auto select-none"
              draggable={false}
            />
            <div
              className={`absolute inset-0 ${selectedTarget ? "cursor-crosshair" : ""}`}
              onClick={handleMapClick}
            />
            {pins.map((pin) => {
              const key = `${pin.positionId}-${pin.side || "main"}`;
              const isSelected = selectedTarget && targetKey(selectedTarget) === key;
              const isDragging = draggingPin && `${draggingPin.positionId}-${draggingPin.side || "main"}` === key;
              return (
                <div
                  key={key}
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, zIndex: isDragging ? 30 : 10 }}
                >
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDraggingPin({ positionId: pin.positionId, side: pin.side });
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      deletePin(pin.positionId, pin.side);
                    }}
                    className={`flex cursor-move flex-col items-center ${isSelected ? "animate-pulse" : ""}`}
                  >
                    <span className="mb-0.5 rounded bg-card/90 px-1 py-0.5 text-[10px] font-semibold shadow-sm whitespace-nowrap" style={{ color: pin.color }}>
                      {pin.name}{pin.sideLabel && `(${pin.sideLabel})`}
                    </span>
                    <MapPin className="h-6 w-6 drop-shadow-md" style={{ color: pin.color, fill: pin.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {pins.length === 0 && (
            <p className="mt-1 text-center text-xs text-muted-foreground">ピンが設定されていません。ポジションを選択してマップをクリックしてください。</p>
          )}
        </div>
      </div>
    </div>
  );
}