import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, FileText, ExternalLink } from "lucide-react";

export default function PositionDetailExpand({ description, resources }) {
  const [expanded, setExpanded] = useState(false);

  const hasDescription = description && description.trim();
  const hasResources = resources && resources.length > 0;
  const hasContent = hasDescription || hasResources;

  if (!hasContent) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <motion.span animate={{ rotate: expanded ? 0 : -90 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="w-3 h-3" />
        </motion.span>
        詳細・資料
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 pl-3 border-l-2 border-primary/20 space-y-1.5">
              {hasDescription && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              )}
              {hasResources && (
                <div className="space-y-1">
                  {resources.map((res, idx) => (
                    <a
                      key={idx}
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/5 border border-primary/20 rounded-lg px-2 py-1.5 transition-colors hover:bg-primary/10"
                    >
                      {res.type === "file" ? (
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{res.label || res.url}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}