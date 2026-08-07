import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Database, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function DataMaintenanceSection() {
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState(null);

  const handleRun = async () => {
    setShowConfirm(false);
    setRunning(true);
    try {
      const res = await base44.functions.invoke("migrateSectionChief", {});
      const data = res?.data;
      if (data?.error) {
        toast.error(data.error);
      } else if (data?.success) {
        setResult(data);
        toast.success(`完了：${data.matched}件中 ${data.updated}件を更新しました`);
      } else {
        toast.error("マイグレーションに失敗しました");
      }
    } catch (e) {
      toast.error("マイグレーションの実行に失敗しました");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl shadow-md p-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-rose-500/10 text-rose-600 rounded-lg p-1.5">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm">データメンテナンス</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          配置表のポジション単位「担当チーフ（chief_name）」に権限を一元化するため、全スタッフの役割から旧「セクションチーフ」を一括削除します。実行前に関連するイベント・スタッフの配置表で担当チーフが設定済みであることを確認してください。
        </p>
        <Button
          variant="outline"
          className="w-full gap-2 border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
          onClick={() => setShowConfirm(true)}
          disabled={running}
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {running ? "実行中..." : "セクションチーフ役割を一括削除"}
        </Button>
        {result && (
          <div className="mt-3 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">
            対象スタッフ総数: {result.totalStaff} / 「セクションチーフ」検出: {result.matched} / 更新成功: {result.updated}
            {result.errors?.length > 0 && (
              <span className="block text-destructive mt-1">失敗: {result.errors.length}件</span>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          message="全スタッフの役割から「セクションチーフ」を一括削除します。この操作は取り消せません。実行しますか？"
          confirmLabel="実行する"
          confirmVariant="destructive"
          onConfirm={handleRun}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}