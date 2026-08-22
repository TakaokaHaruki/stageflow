import { motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * 標準モーダルシェル（情報漏洩・稼働注意事項モーダル準拠）
 * - 中央寄せフローティング / z-[100] / backdrop-blur
 * - rounded-2xl / border / shadow-xl / bg-card / p-6
 * - コンテナ全体が max-h-[90dvh] で内部スクロール
 */
export function ModalHeader({ icon, title, onClose, children, className = "" }) {
  return (
    <div className={`flex items-center gap-2 mb-4 ${className}`}>
      {icon}
      {title ? (
        <h2 className="text-base font-bold flex-1">{title}</h2>
      ) : (
        <div className="flex-1" />
      )}
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ModalFooter({ children, className = "" }) {
  return <div className={`flex gap-2 mt-6 ${className}`}>{children}</div>;
}

export default function ModalShell({
  onClose,
  children,
  maxWidth = "max-w-md",
  closeOnBackdrop = true,
  className = "",
  overlayClassName = "",
}) {
  return (
    <motion.div
      className={`fixed inset-0 h-[100dvh] bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${overlayClassName}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        className={`bg-card border border-border rounded-2xl shadow-xl ${maxWidth} w-full p-6 max-h-[90dvh] overflow-y-auto ${className}`}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}