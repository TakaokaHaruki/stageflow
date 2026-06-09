import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertCircle, Smartphone, Clock, CheckCircle } from "lucide-react";

export default function StaffConfirmationModal({ staffName, onConfirm }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold">スタッフ注意事項</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {staffName}さん、以下の注意事項をご確認ください
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex gap-3 items-start">
            <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              開場中以降の時間帯など、お客様の目の触れる場所でスマートフォンなどを操作しないでください
            </p>
          </div>

          <div className="flex gap-3 items-start">
            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              配置説明などを確認するときは、休憩及び待機中に行ってください
            </p>
          </div>

          <div className="flex gap-3 items-start">
            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed font-medium">
              上記に同意いただけるスタッフの方のみ「次へ進む」ボタンを押してください
            </p>
          </div>
        </div>

        <Button
          onClick={onConfirm}
          className="w-full gap-2"
          size="default"
        >
          次へ進む
        </Button>
      </motion.div>
    </motion.div>
  );
}