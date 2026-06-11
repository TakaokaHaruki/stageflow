import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MapPin, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ConfirmDialog";
import SectionHeader from "@/components/SectionHeader";

function sanitizeSvg(svg) {
  if (!svg) return "";
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+="[^"]*"/gi, "")
    .replace(/\s+on\w+='[^']*'/gi, "");
}

function VenueEditModal({ venue, seatingMap, onClose }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [name, setName] = useState(venue.name || "");
  const [description, setDescription] = useState(venue.description || "");
  const [svgContent, setSvgContent] = useState(seatingMap?.svg_content || "");
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke("updateVenueRecord", {
        action: "update",
        id: venue.id,
        data: { name: name.trim(), description: description.trim() },
      });

      const mapData = {
        venue_id: venue.id,
        svg_content: svgContent.trim(),
        updated_at: new Date().toISOString(),
      };
      if (seatingMap?.id) {
        await base44.entities.SeatingMap.update(seatingMap.id, mapData);
      } else if (svgContent.trim()) {
        await base44.entities.SeatingMap.create(mapData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["seating_maps"] });
      onClose();
    },
    onError: (err) => setError(err?.message || "保存に失敗しました"),
  });

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => setSvgContent(String(target?.result || ""));
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg border border-border bg-card shadow-2xl sm:rounded-lg"
        initial={{ y: 36, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 36, opacity: 0 }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">会場を編集</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="会場名" />
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="備考・説明" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              SVGファイルを読み込む
            </Button>
            <input ref={fileInputRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={handleFile} />
            <span className="text-xs text-muted-foreground">SVGコードを直接編集することもできます</span>
          </div>

          <textarea
            className="min-h-40 w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={svgContent}
            onChange={(event) => setSvgContent(event.target.value)}
            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">...</svg>'
          />

          {svgContent.trim() && (
            <div className="max-h-80 overflow-auto rounded-md border border-border bg-white p-2">
              <div className="flex min-h-48 items-center justify-center [&_svg]:max-h-72 [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgContent) }} />
            </div>
          )}
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
        </div>

        <div className="flex gap-2 border-t border-border p-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button className="flex-1 gap-1.5" disabled={!name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            <Check className="h-3.5 w-3.5" />
            {saveMutation.isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function VenueManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingVenue, setEditingVenue] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: () => base44.entities.Venue.list(),
  });
  const { data: seatingMaps = [] } = useQuery({
    queryKey: ["seating_maps"],
    queryFn: () => base44.entities.SeatingMap.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.functions.invoke("updateVenueRecord", { action: "create", data: { name } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      setNewName("");
      setError(null);
    },
    onError: (err) => setError(err?.message || "会場の追加に失敗しました"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.functions.invoke("updateVenueRecord", { action: "delete", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      queryClient.invalidateQueries({ queryKey: ["seating_maps"] });
    },
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed) createMutation.mutate(trimmed);
  };

  return (
    <div>
      <SectionHeader icon={MapPin} title="会場管理" />
      <div className="flex flex-col gap-3">
        {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
        <div className="flex gap-2">
          <Input
            placeholder="新しい会場名"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleAdd()}
          />
          <Button size="sm" className="shrink-0 gap-1.5" disabled={!newName.trim() || createMutation.isPending} onClick={handleAdd}>
            <Plus className="h-3.5 w-3.5" />追加
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">読み込み中...</div>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">会場が登録されていません</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => {
              const seatingMap = seatingMaps.find((map) => map.venue_id === venue.id);
              return (
                <div key={venue.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{venue.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {seatingMap?.svg_content ? "SVG登録済み" : "SVG未登録"}
                    </div>
                  </div>
                  <button onClick={() => setEditingVenue(venue)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`${venue.name}を編集`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(venue)} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`${venue.name}を削除`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editingVenue && (
          <VenueEditModal
            venue={editingVenue}
            seatingMap={seatingMaps.find((map) => map.venue_id === editingVenue.id)}
            onClose={() => setEditingVenue(null)}
          />
        )}
      </AnimatePresence>

      {confirmDelete && (
        <ConfirmDialog
          message={`「${confirmDelete.name}」を削除しますか？\n紐づいた客席配置図データも失われます。`}
          confirmLabel="削除"
          onConfirm={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
