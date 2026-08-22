import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import ModalShell from "@/components/ModalShell";

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "削除", confirmVariant = "destructive" }) {
  const isDestructive = confirmVariant === "destructive";

  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-sm">
      <div className="flex items-start gap-2 mb-4">
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
    </ModalShell>
  );
}