import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Download, Users, Layers, Trash2, Crosshair } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/SectionHeader";
import { useUserRole } from "@/hooks/useUserRole";
import { usePositionMapPins } from "@/hooks/usePositionMapPins";
import { useDeviceAuth } from "@/hooks/useDeviceAuth";
import { generateMapPDF } from "@/lib/pdfGenerator";
import { loadEventById } from "@/lib/eventLoader";
import { TIME_SLOT_STYLES } from "@/lib/constants";
import { toast } from "sonner";

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg || "")}`;
}

function staffListOf(pos) {
  if (pos.split_by_side) {
    return [
      ...(pos.staff_names_kamite || []),
      ...(pos.staff_names_shimote || []),
    ];
  }
  return pos.staff_names || [];
}

export default function PositionMapManager({ eventId }) {
  const { canEdit } = useUserRole();
  const editable = canEdit;
  const { canAccess } = useDeviceAuth();

  const mapWrapRef = useRef(null);
  const [activePositionName, setActivePositionName] = useState(null);
  const [svgContent, setSvgContent] = useState("");
  const [mapSrc, setMapSrc] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => loadEventById(eventId),
  });

  const { data: venues = [] } = useQuery({
    queryKey: ["venues"],
    queryFn: () => base44.entities.Venue.list(),
  });
  const { data: seatingMaps = [] } = useQuery({
    queryKey: ["seating_maps"],
    queryFn: () => base44.entities.SeatingMap.list(),
  });

  const { data: rawPositions = [] } = useQuery({
    queryKey: ["positions", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPositionList", { eventId });
      return res?.data?.positions ?? [];
    },
  });

  const venue = useMemo(() => {
    const name = (event?.venue || "").trim();
    if (!name) return null;
    return venues.find((v) => v.name === name) || null;
  }, [event, venues]);

  const venueId = venue?.id || "";
  const { pins, upsertMutation, deleteMutation } = usePositionMapPins(venueId);

  const pinByPosition = useMemo(() => {
    const map = {};
    for (const pin of pins) map[pin.position_name] = pin;
    return map;
  }, [pins]);

  // 会場マップの画像ソースを決定（会場の客席配置図を優先、なければイベント地図画像）
  const mapImageSource = useMemo(() => {
    if (venueId) {
      const sm = seatingMaps.find((m) => m.venue_id === venueId && m.svg_url);
      if (sm?.svg_url) return { type: "svg", url: sm.svg_url };
    }
    if (event?.map_image_url) return { type: "image", url: event.map_image_url };
    return null;
  }, [venueId, seatingMaps, event]);

  // SVGの場合はfetchしてdata URI化（html2canvasでの確実な描画とCORS回避）
  useEffect(() => {
    let cancelled = false;
    setSvgContent("");
    setMapSrc("");
    if (!mapImageSource) return;
    if (mapImageSource.type === "image") {
      setMapSrc(mapImageSource.url);
      return;
    }
    fetch(mapImageSource.url)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        setSvgContent(text);
        setMapSrc(svgDataUri(text));
      })
      .catch(() => {
        if (!cancelled) setMapSrc(mapImageSource.url);
      });
    return () => {
      cancelled = true;
    };
  }, [mapImageSource]);

  const positions = useMemo(() => {
    return [...rawPositions].sort((a, b) => {
      const sa = (a.time_slot || "開場中").localeCompare(b.time_slot || "開場中");
      if (sa !== 0) return sa;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [rawPositions]);

  const savePin = (positionName, x, y) => {
    if (!venueId) return;
    const existing = pinByPosition[positionName];
    upsertMutation.mutate({
      venueId,
      venueName: venue?.name || "",
      positionName,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      existingId: existing?.id,
    });
  };

  const handleMapClick = (e) => {
    if (!editable || !activePositionName) return;
    const rect = mapWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    savePin(activePositionName, x, y);
  };

  const handlePinPointerDown = (e, positionName) => {
    if (!editable) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = mapWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setActivePositionName(positionName);
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = pinByPosition[positionName] || { map_x: 50, map_y: 50 };
    const origX = orig.map_x ?? 50;
    const origY = orig.map_y ?? 50;
    let moved = false;

    const onMove = (ev) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      if (Math.abs(ev.clientX - startX) > 2 || Math.abs(ev.clientY - startY) > 2) {
        moved = true;
      }
      const nx = Math.min(100, Math.max(0, origX + dx));
      const ny = Math.min(100, Math.max(0, origY + dy));
      // 楽観的に一時上書き（ローカル描画だけ。保存は離脱時）
      pinByPosition[positionName] = { ...pinByPosition[positionName], map_x: nx, map_y: ny };
      // force re-render用にstateを使う
      setDragNonce((n) => n + 1);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (moved) {
        const cur = pinByPosition[positionName];
        if (cur) savePin(positionName, cur.map_x, cur.map_y);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const [dragNonce, setDragNonce] = useState(0);

  const handleDeletePin = (positionName) => {
    const pin = pinByPosition[positionName];
    if (pin?.id) {
      deleteMutation.mutate(pin.id);
    }
  };

  const handleExportPDF = async () => {
    if (!mapSrc) return;
    if (!canAccess("export_pdf")) {
      toast.error("この機能は貸与端末限定です。貸与端末で認証してください。");
      return;
    }
    setExporting(true);
    try {
      await generateMapPDF(
        {
          event,
          mapImage: mapSrc,
          pins: pins.map((p) => ({
            position_name: p.position_name,
            map_x: p.map_x,
            map_y: p.map_y,
          })),
          positions: rawPositions,
        },
        `${(event?.name || "配置表マップ").replace(/[\\/:*?"<>|]/g, "")}_配置表マップ`
      );
    } catch (err) {
      toast.error("PDF出力に失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const noVenue = !venueId;
  const noMap = !mapImageSource;

  return (
    <div className="space-y-2">
      <SectionHeader
        icon={MapPin}
        title="配置表マップ"
        description={positions.length ? `${positions.length}ポジション` : undefined}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-7 text-[11px] px-1.5 shrink-0"
            onClick={handleExportPDF}
            disabled={exporting || noMap || !mapSrc}
          >
            <Download className="w-3 h-3" />
            {exporting ? "..." : "PDF出力"}
          </Button>
        }
      />

      {noVenue && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          このイベントの会場が会場マスターに登録されていないため、ピン位置を保存できません。管理設定の会場管理で会場「{event?.venue || ""}」を登録してください。
        </div>
      )}

      <div className="grid min-w-0 gap-2 sm:grid-cols-[200px_minmax(0,1fr)]">
        {/* ポジションリスト */}
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            ポジション
          </div>
          <div className="max-h-[70svh] space-y-0.5 overflow-y-auto sm:max-h-[calc(100svh-220px)]">
            {positions.length === 0 ? (
              <p className="px-1 py-3 text-xs text-muted-foreground">ポジションがありません</p>
            ) : (
              positions.map((pos) => {
                const name = pos.name;
                const staff = staffListOf(pos);
                const pinned = Boolean(pinByPosition[name]);
                const active = activePositionName === name;
                const slot = pos.time_slot || "開場中";
                const style = TIME_SLOT_STYLES[slot] || TIME_SLOT_STYLES["開場中"];
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setActivePositionName(name)}
                    className={`flex w-full items-start gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : pinned
                        ? "border-border bg-card hover:bg-muted"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-xs font-semibold">{name}</span>
                        {pinned && <MapPin className="h-3 w-3 shrink-0 text-primary" />}
                      </span>
                      <span className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Users className="h-2.5 w-2.5" />
                        {staff.length}名
                      </span>
                    </span>
                    {editable && pinned && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePin(name);
                        }}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="ピンを削除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {editable && activePositionName && (
            <p className="mt-1.5 flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-[10px] text-primary">
              <Crosshair className="h-3 w-3 shrink-0" />
              「{activePositionName}」を選択中　マップをクリックして配置
            </p>
          )}
        </div>

        {/* マップ表示 */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border pb-1.5">
            <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug">
              {venue?.name || event?.venue || "会場未登録"}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {noMap ? "会場マップ未登録" : "会場マップ"}
            </span>
          </div>
          {noMap || !mapSrc ? (
            <div className="flex h-[55svh] min-h-72 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 sm:h-[calc(100svh-220px)] sm:min-h-80">
              <MapPin className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">会場マップが未登録です</p>
              <p className="text-xs text-muted-foreground">
                管理設定の会場管理から客席配置図（SVG）を登録するか、イベントの会場マップ画像を設定してください。
              </p>
            </div>
          ) : (
            <div className="flex max-h-[70svh] min-h-72 items-center justify-center overflow-auto rounded-md border border-border bg-white p-2 sm:max-h-[calc(100svh-220px)] sm:min-h-80">
              <div
                ref={mapWrapRef}
                className="relative inline-block"
                onClick={handleMapClick}
                style={{ cursor: editable && activePositionName ? "crosshair" : "default" }}
              >
                <img
                  src={mapSrc}
                  alt="会場マップ"
                  className="block max-h-[68svh] max-w-full select-none sm:max-h-[calc(100svh-260px)]"
                  draggable={false}
                  crossOrigin={mapImageSource?.type === "image" ? "anonymous" : undefined}
                />
                {Array.from(new Set(positions.map((p) => p.name)))
                  .filter((name) => pinByPosition[name])
                  .map((name) => {
                    const pin = pinByPosition[name];
                    const staff = Array.from(
                      new Set(positions.filter((p) => p.name === name).flatMap(staffListOf))
                    );
                    const active = activePositionName === name;
                    return (
                      <div
                        key={name}
                        onPointerDown={(e) => handlePinPointerDown(e, name)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePositionName(name);
                        }}
                        style={{ left: `${pin.map_x}%`, top: `${pin.map_y}%` }}
                        className={`absolute z-10 -translate-x-1/2 -translate-y-full touch-none ${editable ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        <div
                          className={`flex flex-col items-center gap-0.5 rounded-md border px-1.5 py-1 text-center shadow-elevated ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground"
                          }`}
                        >
                          <span className="flex items-center gap-0.5 text-[10px] font-bold leading-none">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            {name}
                          </span>
                          {staff.length > 0 && (
                            <span className={`max-w-32 text-[9px] leading-tight ${active ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                              {staff.join("・")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}