import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { BookmarkPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIME_SLOTS } from "@/lib/constants";
import { motion } from "framer-motion";

/**
 * 現在のイベントのポジション構成をプリセットとして保存するモーダル。
 *
 * Props:
 *   positions       - 現在のイベントのポジション配列
 *   positionTypes   - 全PositionType配列
 *   onClose         - 閉じるコールバック
 */
export default function SaveAsPresetModal({ positions, positionTypes, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // ポジション名 → PositionType ID へのマッピング
  const buildSlotPositions = () => {
    const result = {};
    for (const slot of TIME_SLOTS) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positionPresets"] });
      toast.success("プリセットを保存しました");
      onClose();
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const totalPositions = positions.length;
  const slotSummary = TIME_SLOTS.map((slot) => {
    const count = positions.filter((p) => (p.time_slot || "開場中") === slot).length;
    return count > 0 ? `${slot}：${count}件` : null;
  }).filter(Boolean);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">現在の配置をプリセット保存</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* サマリ */}
        <div className="px-4 py-2 bg-muted/40 border-b border-border">
          <p className="text-[11px] text-muted-foreground">
            登録対象：{totalPositions}ポジション（{slotSummary.join("　")}）
          </p>
          {totalPositions === 0 && (
            <p className="text-[11px] text-destructive mt-0.5">ポジションが登録されていません。</p>
          )}
        </div>

        {/* フォーム */}
        <div className="px-4 py-3 space-y-3">
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

        {/* フッター */}
        <div className="flex gap-2 px-4 pb-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
          <Button
            className="flex-1 gap-1"
            disabled={!name.trim() || totalPositions === 0 || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "保存中..." : "保存"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}