import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "削除", confirmVariant = "destructive" }) {
  const isDestructive = confirmVariant === "destructive";

  return (
    <motion.div
      className="fixed inset-0 z-[60] h-[100dvh] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm p-4 max-h-[90dvh] overflow-y-auto"
        initial={{ y: 30, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start gap-2 mb-3">
          <div className={`p-2 rounded-full shrink-0 ${isDestructive ? "bg-destructive/10" : "bg-primary/10"}`}>
            <AlertTriangle className={`w-5 h-5 ${isDestructive ? "text-destructive" : "text-primary"}`} />
          </div>
          <p className="text-sm text-foreground leading-relaxed pt-1 whitespace-pre-line">{message}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>キャンセル</Button>
          <Button
            className="flex-1"
            variant={confirmVariant}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}