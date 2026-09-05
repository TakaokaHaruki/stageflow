import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ModalShell from "@/components/ModalShell";

/**
 * アカウント削除の二次確認モーダル。
 * 誤操作による削除を防ぐため、自分の表示名の再入力が必要。
 */
export default function DeleteAccountModal({ displayName, onConfirm, onCancel }) {
  const [confirmName, setConfirmName] = useState("");
  const matches = Boolean(displayName) && confirmName.trim() === displayName.trim();

  return (
    <ModalShell onClose={onCancel} maxWidth="max-w-sm">
      <div className="flex items-start gap-2 mb-4">
        <div className="p-2 rounded-full bg-destructive/10 shrink-0">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div className="text-sm leading-relaxed pt-1">
          <p className="font-semibold text-foreground">アカウントを削除</p>
          <p className="mt-1 text-muted-foreground">
            この操作は取り消せません。確認のため、あなたの表示名「{displayName}」を入力してください。
          </p>
        </div>
      </div>
      <Input
        value={confirmName}
        onChange={(e) => setConfirmName(e.target.value)}
        placeholder={displayName}
        autoFocus
      />
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>キャンセル</Button>
        <Button variant="destructive" className="flex-1" disabled={!matches} onClick={onConfirm}>
          削除する
        </Button>
      </div>
    </ModalShell>
  );
}