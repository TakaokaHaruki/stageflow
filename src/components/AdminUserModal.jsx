import { motion } from "framer-motion";
import { X, ShieldCheck } from "lucide-react";
import UserRoleManager from "@/components/UserRoleManager";

export default function AdminUserModal({ onClose }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-2 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
        initial={{ y: 36, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />管理者設定
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 overflow-y-auto flex-1">
          <UserRoleManager />
        </div>
      </motion.div>
    </motion.div>
  );
}