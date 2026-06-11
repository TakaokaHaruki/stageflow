import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, MapPin, ZoomIn, ZoomOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SectionHeader from "@/components/SectionHeader";

function sanitizeSvg(svg) {
  return (svg || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "");
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
    fetch(svgUrl).then((r) => r.text()).then(setSvgContent).catch(() => setSvgContent(""));
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
        <button onClick={() => setScale((value) => clampScale(value + 0.2))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-foreground" aria-label="拡大">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setScale((value) => clampScale(value - 0.2))} className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-foreground" aria-label="縮小">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="flex h-7 items-center justify-center rounded-md border border-border bg-card/80 px-2 text-xs text-muted-foreground backdrop-blur-sm hover:text-foreground">
          リセット
        </button>
      </div>
      <div
        ref={containerRef}
        className="w-full cursor-grab overflow-hidden rounded-md border border-border bg-white active:cursor-grabbing"
        style={{ height: "calc(100svh - 300px)", minHeight: 360, touchAction: "none" }}
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
      <SectionHeader icon={MapPin} title="客席配置図" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => {
          const hasMap = seatingMaps.some((map) => map.venue_id === venue.id && map.svg_url);
          const selected = venue.id === selectedVenueId;
          return (
            <button key={venue.id} onClick={() => setSelectedVenueId(venue.id)} className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}>
              <MapPin className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{venue.name}</span>
              {hasMap && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
            </button>
          );
        })}
      </div>
      {currentMap?.svg_url ? (
        <div className="space-y-2">
          <div className="text-sm font-semibold">{selectedVenue?.name}</div>
          <SvgDisplay svgUrl={currentMap.svg_url} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted/30 py-16">
          <MapPin className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium">{selectedVenue?.name}</p>
          <p className="text-xs text-muted-foreground">客席配置図は未登録です。管理設定の会場管理から登録できます。</p>
        </div>
      )}
    </div>
  );
}