import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, MapPin, UsersRound, ZoomIn, ZoomOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SectionHeader from "@/components/SectionHeader";

function sanitizeSvg(svg) {
  return (svg || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "");
}

function capacityLabel(capacity) {
  const value = Number(capacity);
  return Number.isFinite(value) && value > 0
    ? `最大収容 ${value.toLocaleString("ja-JP")}人`
    : "最大収容人数 未登録";
}

function SvgDisplay({ svgUrl }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const clampScale = (value) => Math.min(Math.max(value, 0.3), 5);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setSvgContent("");
    if (!svgUrl) return;
    fetch(svgUrl).then((response) => response.text()).then(setSvgContent).catch(() => setSvgContent(""));
  }, [svgUrl]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const handleWheel = (event) => {
      event.preventDefault();
      setScale((value) => clampScale(value + (event.deltaY > 0 ? -0.1 : 0.1)));
    };
    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  const beginDrag = (x, y) => {
    dragging.current = true;
    dragStart.current = { x, y, ox: offset.x, oy: offset.y };
  };
  const moveDrag = (x, y) => {
    if (!dragging.current) return;
    setOffset({ x: dragStart.current.ox + x - dragStart.current.x, y: dragStart.current.oy + y - dragStart.current.y });
  };

  return (
    <div className="relative">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <button onClick={() => setScale((value) => clampScale(value + 0.2))} className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-foreground sm:h-7 sm:w-7" aria-label="拡大">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setScale((value) => clampScale(value - 0.2))} className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-foreground sm:h-7 sm:w-7" aria-label="縮小">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="flex h-8 items-center justify-center rounded-md border border-border bg-card/80 px-2 text-[11px] text-muted-foreground backdrop-blur-sm hover:text-foreground sm:h-7 sm:text-xs">
          リセット
        </button>
      </div>
      <div
        ref={containerRef}
        className="h-[55svh] min-h-80 w-full cursor-grab overflow-hidden rounded-md border border-border bg-white active:cursor-grabbing sm:h-[calc(100svh-220px)] sm:min-h-[440px]"
        style={{ touchAction: "none" }}
        onMouseDown={(event) => beginDrag(event.clientX, event.clientY)}
        onMouseMove={(event) => moveDrag(event.clientX, event.clientY)}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
        onTouchStart={(event) => event.touches.length === 1 && beginDrag(event.touches[0].clientX, event.touches[0].clientY)}
        onTouchMove={(event) => event.touches.length === 1 && moveDrag(event.touches[0].clientX, event.touches[0].clientY)}
        onTouchEnd={() => { dragging.current = false; }}
      >
        <div className="flex h-full w-full items-center justify-center" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "center center" }}>
          <div className="flex h-full w-full items-center justify-center [&_svg]:max-h-full [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent) }} />
        </div>
      </div>
    </div>
  );
}

export default function SeatingMapViewer() {
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const { data: venues = [], isLoading } = useQuery({ queryKey: ["venues"], queryFn: () => base44.entities.Venue.list() });
  const { data: seatingMaps = [] } = useQuery({ queryKey: ["seating_maps"], queryFn: () => base44.entities.SeatingMap.list() });

  useEffect(() => {
    if (!selectedVenueId && venues.length) setSelectedVenueId(venues[0].id);
  }, [selectedVenueId, venues]);

  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId);
  const currentMap = seatingMaps.find((map) => map.venue_id === selectedVenueId);

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">読み込み中...</div>;
  if (!venues.length) return <div className="py-10 text-center text-sm text-muted-foreground">会場が登録されていません</div>;

  return (
    <div className="space-y-3">
      <SectionHeader icon={MapPin} title="客席配置図" subtitle={`${venues.length}会場`} />
      <div className="grid min-w-0 gap-3 sm:grid-cols-[260px_minmax(0,1fr)]">
        <div className="relative min-w-0">
          <div className="flex max-w-full snap-x snap-mandatory gap-2 overflow-x-auto pb-1 pr-8 sm:max-h-[calc(100svh-220px)] sm:flex-col sm:overflow-x-hidden sm:overflow-y-auto sm:pb-0 sm:pr-1">
          {venues.map((venue) => {
            const hasMap = seatingMaps.some((map) => map.venue_id === venue.id && map.svg_url);
            const selected = venue.id === selectedVenueId;
            return (
              <button
                key={venue.id}
                onClick={() => setSelectedVenueId(venue.id)}
                className={`flex min-h-[58px] w-[calc(100vw-3.5rem)] max-w-64 shrink-0 snap-start items-start gap-2 rounded-md border px-2.5 py-2 text-left transition-colors sm:min-h-[62px] sm:w-auto sm:min-w-0 sm:max-w-none sm:shrink sm:px-3 sm:py-2.5 ${selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}
              >
                <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block break-words text-[13px] font-medium leading-[1.35]">{venue.name}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{capacityLabel(venue.max_capacity)}</span>
                </span>
                {hasMap && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              </button>
            );
          })}
          </div>
          <div className="pointer-events-none absolute bottom-1 right-0 top-0 flex w-10 items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent pr-1 sm:hidden">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex min-h-10 flex-wrap items-start justify-between gap-x-3 gap-y-1 border-b border-border pb-2">
            <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug">{selectedVenue?.name}</h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UsersRound className="h-3.5 w-3.5" />
              {capacityLabel(selectedVenue?.max_capacity)}
            </div>
          </div>
          {currentMap?.svg_url ? (
            <SvgDisplay svgUrl={currentMap.svg_url} />
          ) : (
            <div className="flex h-[55svh] min-h-80 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 sm:h-[calc(100svh-220px)] sm:min-h-[440px]">
              <MapPin className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium">{selectedVenue?.name}</p>
              <p className="text-xs text-muted-foreground">客席配置図は未登録です。管理設定の会場管理から登録できます。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
