import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Briefcase, X } from "lucide-react";

export default function ComplianceAgreementModal({ staffName, onConfirm, onBack, onClose }) {
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
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="text-base font-bold flex-1">情報漏洩・稼働注意事項</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {staffName}さん、以下の重要事項をご確認ください
        </p>

        <div className="space-y-4 mb-6">
          {/* 情報漏洩に関して */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-orange-500 shrink-0" />
              <h3 className="text-sm font-bold text-orange-700 dark:text-orange-400">
                【情報漏洩に関して】
              </h3>
            </div>
            <ul className="text-xs space-y-1.5 text-orange-900 dark:text-orange-100 leading-relaxed">
              <li>• 本稼働で知り得たコンサート機密情報の取り扱いには十分注意してください</li>
              <li>• 本稼働で知り得た情報を SNS やブログ等での発信は固く禁じます（〇〇のコンサートでバイトしました！などの SNS 投稿や LINE で友人に共有するなどを全て禁止、過去に SNS 投稿等が発覚し投稿の削除や損害賠償請求などが発生した事例があります）</li>
              <li>• 休憩中であっても公共の場でのコンサートに関わる内容の会話は避けてください</li>
              <li>• 万が一情報漏洩が発生した場合は直ちに責任者に報告してください</li>
            </ul>
          </div>

          {/* 稼働に関して */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-blue-500 shrink-0" />
              <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">
                【稼働に関して】
              </h3>
            </div>
            <ul className="text-xs space-y-1.5 text-blue-900 dark:text-blue-100 leading-relaxed">
              <li>• 各社員やチーフからの指示に従ってください</li>
              <li>• 体調不良の場合はできるだけ早く各社員やチーフに連絡してください</li>
              <li>• お客様と接する場面でスマホを触ったりだるそうな態度を取らず、自分ができる限りの敬語・丁寧語を使用してください</li>
              <li>• 分からないことは自己判断せず必ず各社員やチーフに確認してください</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onBack}
            variant="outline"
            className="flex-1"
            size="default"
          >
            戻る
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
            size="default"
          >
            同意してログイン
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}