import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIME_SLOTS, CONTINUOUS_SLOT } from "@/lib/constants";
import { useOperationLog } from "@/hooks/useOperationLog";
import ModalShell, { ModalHeader, ModalFooter } from "@/components/ModalShell";

/**
 * 現在のイベントのポジション構成をプリセットとして保存するモーダル。
 */
export default function SaveAsPresetModal({ positions, positionTypes, eventId, continuousMode = false, onClose }) {
  const queryClient = useQueryClient();
  const { record } = useOperationLog(eventId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const activeSlots = continuousMode ? [CONTINUOUS_SLOT] : TIME_SLOTS;

  const buildSlotPositions = () => {
    const result = {};
    for (const slot of activeSlots) {
      const slotPositions = positions
        .filter((p) => (p.time_slot || "開場中") === slot)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const ids = slotPositions
        .map((p) => {
          const pt = positionTypes.find((t) => t.name === p.name);
          return pt?.id ?? null;
        })
        .filter(Boolean);
      if (ids.length > 0) result[slot] = ids;
    }
    return result;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slot_positions = buildSlotPositions();
      return base44.functions.invoke("updatePositionPresetRecord", {
        action: "create",
        data: { name: name.trim(), description: description.trim() || undefined, slot_positions, positions: [] },
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["positionPresets"] });
      toast.success("プリセットを保存しました");
      const savedName = name.trim();
      record({
        action_type: "preset_save",
        description: `現在の配置を「${savedName}」として保存しました`,
        entity_type: "PositionPreset",
        entity_id: result?.data?.preset?.id || result?.id || "",
      });
      onClose();
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const totalPositions = positions.length;
  const slotSummary = activeSlots.map((slot) => {
    const count = positions.filter((p) => (p.time_slot || "開場中") === slot).length;
    return count > 0 ? `${slot}：${count}件` : null;
  }).filter(Boolean);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-sm">
      <ModalHeader
        icon={<BookmarkPlus className="w-5 h-5 text-primary" />}
        title="現在の配置をプリセット保存"
        onClose={onClose}
      />

      <div className="bg-muted/40 rounded-lg p-3 mb-4">
        <p className="text-[11px] text-muted-foreground">
          登録対象：{totalPositions}ポジション（{slotSummary.join("　")}）
        </p>
        {totalPositions === 0 && (
          <p className="text-[11px] text-destructive mt-0.5">ポジションが登録されていません。</p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">プリセット名 <span className="text-destructive">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：通常配置、大型イベント用"
            className="w-full text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">説明（任意）</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：3時間帯フル配置"
            className="w-full text-sm border border-input rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
        <Button
          className="flex-1 gap-1"
          disabled={!name.trim() || totalPositions === 0 || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          {saveMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </ModalFooter>
    </ModalShell>
  );
}