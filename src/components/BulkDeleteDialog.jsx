import { Button } from "@/components/ui/button";
import { Trash2, UserMinus } from "lucide-react";
import { motion } from "framer-motion";

export default function BulkDeleteDialog({ slot, count, onClearStaff, onDeletePositions, onCancel }) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-4"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-sm font-semibold text-foreground mb-1">「{slot}」の一括削除</p>
        <p className="text-xs text-muted-foreground mb-4">削除方法を選択してください（{count}件のポジション対象）</p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onClearStaff}
            className="flex items-start gap-3 px-3 py-3 rounded-lg border border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left"
          >
            <UserMinus className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">スタッフのみ削除</p>
              <p className="text-xs text-muted-foreground">ポジションを残したまま、配置済みスタッフをすべて解除します</p>
            </div>
          </button>

          <button
            onClick={onDeletePositions}
            className="flex items-start gap-3 px-3 py-3 rounded-lg border border-border hover:border-destructive/60 hover:bg-destructive/5 transition-colors text-left"
          >
            <Trash2 className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">ポジションごと削除</p>
              <p className="text-xs text-muted-foreground">ポジション自体をすべて削除します（元に戻せません）</p>
            </div>
          </button>

          <Button variant="outline" className="w-full mt-1" onClick={onCancel}>
            キャンセル
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}