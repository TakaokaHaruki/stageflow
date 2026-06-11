import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, MapPin } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";

export default function VenueManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: () => base44.entities.Venue.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.Venue.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["venues"] });
      setNewName("");
      setError(null);
    },
    onError: (err) => {
      setError(err?.message || "会場の追加に失敗しました");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Venue.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["venues"] }),
  });

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="px-3 py-2 rounded-md bg-destructive/10 text-destructive text-xs">⚠️ {error}</div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="新しい会場名"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          disabled={!newName.trim() || createMutation.isPending}
          onClick={handleAdd}
        >
          <Plus className="w-3.5 h-3.5" />追加
        </Button>
      </div>

      {venues.length === 0 ? (
        <div className="py-8 flex flex-col items-center gap-2 text-center">
          <MapPin className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">会場が登録されていません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {venues.map((venue) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card"
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium truncate">{venue.name}</span>
                {venue.description && (
                  <span className="text-xs text-muted-foreground truncate max-w-40">{venue.description}</span>
                )}
                <button
                  onClick={() => setConfirmDelete(venue)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`「${confirmDelete.name}」を削除しますか？\n紐づく配置図データも失われます。`}
          confirmLabel="削除"
          onConfirm={() => { deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}