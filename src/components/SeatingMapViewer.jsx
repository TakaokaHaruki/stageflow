import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Pencil, MapPin, ChevronDown, Upload, X, Check, ZoomIn, ZoomOut } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { motion, AnimatePresence } from "framer-motion";

// Minimal SVG sanitizer: strips script/event handler attributes
function sanitizeSvg(svgString) {
  if (!svgString) return "";
  // Remove <script> tags
  let cleaned = svgString.replace(/<script[\s\S]*?<\/script>/gi, "");
  // Remove on* event attributes
  cleaned = cleaned.replace(/\s+on\w+="[^"]*"/gi, "");
  cleaned = cleaned.replace(/\s+on\w+='[^']*'/gi, "");
  return cleaned;
}

function VenueSelector({ venues, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = venues.find((v) => v.id === selectedId);

  if (venues.length === 0) return null;

  if (venues.length <= 4) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {venues.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors select-none ${
              v.id === selectedId
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-border text-xs font-medium text-foreground bg-card hover:bg-muted transition-colors select-none"
      >
        <MapPin className="w-3 h-3 text-primary" />
        {selected?.name || "会場を選択"}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-40">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => { onSelect(v.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                v.id === selectedId ? "text-primary font-semibold" : "text-foreground"
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SvgEditor({ venueId, existing, onClose }) {
  const queryClient = useQueryClient();
  const [svgText, setSvgText] = useState(existing?.svg_content || "");
  const fileInputRef = useRef(null);

  const saveMutation = useMutation({
    mutationFn: async (content) => {
      const now = new Date().toISOString();
      if (existing?.id) {
        return base44.entities.SeatingMap.update(existing.id, { svg_content: content, updated_at: now });
      } else {
        return base44.entities.SeatingMap.create({ venue_id: venueId, svg_content: content, updated_at: now });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seating_maps"] });
      onClose();
    },
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSvgText(ev.target.result || "");
    reader.readAsText(file);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.28 }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
          <h3 className="text-sm font-semibold">客席配置図を登録・編集</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3 h-3" />SVGファイルを読み込む
            </Button>
            <input ref={fileInputRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={handleFile} />
            <span className="text-xs text-muted-foreground">またはテキストで直接入力</span>
          </div>
          <textarea
            className="w-full flex-1 min-h-48 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">\n  <!-- ここにSVGコードを貼り付けてください -->\n</svg>'}
            value={svgText}
            onChange={(e) => setSvgText(e.target.value)}
          />
          {svgText && (
            <div className="border border-border rounded-lg overflow-auto max-h-64 bg-white p-2">
              <p className="text-[10px] text-muted-foreground mb-1">プレビュー</p>
              <div
                className="w-full"
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgText) }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-2 border-t border-border shrink-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button
            className="flex-1 gap-1.5"
            disabled={!svgText.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate(svgText.trim())}
          >
            <Check className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "保存中..." : "保存する"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SvgDisplay({ svgContent }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const lastTouchDist = useRef(null);

  const clampScale = (s) => Math.min(Math.max(s, 0.3), 5);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => clampScale(s + delta));
  };

  const handleMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const handleMouseUp = () => { isDragging.current = false; };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1) {
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offset.x, oy: offset.y };
    }
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - lastTouchDist.current) * 0.005;
      setScale((s) => clampScale(s + delta));
      lastTouchDist.current = dist;
    } else if (e.touches.length === 1 && isDragging.current) {
      setOffset({
        x: dragStart.current.ox + (e.touches[0].clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.touches[0].clientY - dragStart.current.y),
      });
    }
  };
  const handleTouchEnd = () => { isDragging.current = false; lastTouchDist.current = null; };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  });

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          onClick={() => setScale((s) => clampScale(s + 0.2))}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-card/80 border border-border backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setScale((s) => clampScale(s - 0.2))}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-card/80 border border-border backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
          className="h-7 px-2 flex items-center justify-center rounded-md bg-card/80 border border-border backdrop-blur-sm text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          リセット
        </button>
      </div>
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-lg border border-border bg-white cursor-grab active:cursor-grabbing"
        style={{ height: "calc(100svh - 260px)", minHeight: 320, touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="w-full h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent) }}
          />
        </div>
      </div>
    </div>
  );
}

export default function SeatingMapViewer({ eventId }) {
  const { isAdmin, isChief } = useUserRole();
  const isPrivileged = isAdmin || isChief;
  const [selectedVenueId, setSelectedVenueId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: venues = [] } = useQuery({
    queryKey: ["venues"],
    queryFn: () => base44.entities.Venue.list(),
  });

  const { data: seatingMaps = [] } = useQuery({
    queryKey: ["seating_maps"],
    queryFn: () => base44.entities.SeatingMap.list(),
  });

  // Auto-select first venue
  useEffect(() => {
    if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  const selectedVenue = venues.find((v) => v.id === selectedVenueId);
  const currentMap = seatingMaps.find((m) => m.venue_id === selectedVenueId);

  if (venues.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center gap-3 text-center">
        <MapPin className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">会場が登録されていません</p>
        {isPrivileged && (
          <p className="text-xs text-muted-foreground">管理設定から会場を追加してください</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader
        icon={MapPin}
        title="客席配置図"
        subtitle={selectedVenue?.name}
        actions={
          <div className="flex items-center gap-2">
            <VenueSelector
              venues={venues}
              selectedId={selectedVenueId}
              onSelect={setSelectedVenueId}
            />
            {isPrivileged && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7"
                onClick={() => setShowEditor(true)}
              >
                <Pencil className="w-3 h-3" />
                {currentMap ? "編集" : "登録"}
              </Button>
            )}
          </div>
        }
      />

      {currentMap?.svg_content ? (
        <SvgDisplay svgContent={currentMap.svg_content} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-16">
          <MapPin className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">配置図未登録</p>
          {isPrivileged && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs mt-1" onClick={() => setShowEditor(true)}>
              <Pencil className="w-3 h-3" />SVGを登録する
            </Button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showEditor && (
          <SvgEditor
            venueId={selectedVenueId}
            existing={currentMap}
            onClose={() => setShowEditor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}