import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Lock, Briefcase } from "lucide-react";

export default function ComplianceAgreementModal({ staffName, onConfirm, onBack }) {
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
          <h2 className="text-base font-bold">情報漏洩・稼働注意事項</h2>
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
              <li>• 顧客情報、イベント関係者様の個人情報、社内機密情報の取り扱いには十分注意してください</li>
              <li>• 業務で知り得た情報を SNS やブログ等での発信は固く禁じます</li>
              <li>• 休憩中であっても、公共の場での大声での会話は避けてください</li>
              <li>• 万が一情報漏洩が発生した場合は、直ちに責任者に報告してください</li>
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
              <li>• 指示された時間・場所には厳守して集合してください</li>
              <li>• 体調不良や遅刻・欠席の場合は、できるだけ早く責任者に連絡してください</li>
              <li>• 服装・身だしなみは各イベントの指示に従ってください</li>
              <li>• 稼働中は常に周囲への気配りとホスピタリティを心がけてください</li>
              <li>• 分からないことは自己判断せず、必ず責任者に確認してください</li>
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