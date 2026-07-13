import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeader from "@/components/SectionHeader";
import PositionTypeOverrideSection from "@/components/PositionTypeOverrideSection";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";

export default function PositionNotesEditor({ eventId }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [openAccordionIds, setOpenAccordionIds] = useState({});

  const { data: positionTypes = [], isLoading } = useQuery({
    queryKey: ["positionTypes"],
    queryFn: () => base44.entities.PositionType.list(),
    select: (d) => [...d].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  // Fetch override presence to show badges
  const { data: overrides = [] } = useQuery({
    queryKey: ["positionTypeOverrides", eventId],
    queryFn: () => base44.entities.PositionTypeOverride.filter({ event_id: eventId }),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });
  const overrideNames = new Set(overrides.map((o) => o.position_type_name));

  const useTabs = positionTypes.length <= 5;
  const selected = positionTypes[selectedIdx];

  const toggleAccordion = (id) => {
    setOpenAccordionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div>
        <SectionHeader
          icon={FileText}
          title="ポジション説明"
          subtitle="ポジション属性ごとにイベント固有の説明文・資料を管理します。"
        />
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (positionTypes.length === 0) {
    return (
      <div>
        <SectionHeader
          icon={FileText}
          title="ポジション説明"
          subtitle="ポジション属性ごとにイベント固有の説明文・資料を管理します。"
        />
        <div className="text-center py-12">
          <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">ポジション属性がまだ登録されていません</p>
          <p className="text-xs text-muted-foreground/70 mt-1">先にポジション属性を登録してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={FileText}
        title="ポジション説明"
        subtitle="ポジション属性ごとにイベント固有の説明文・資料を管理します。"
      />

      {useTabs ? (
        /* Tab navigation for ≤5 types */
        <>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            {positionTypes.map((pt, idx) => {
              const isActive = idx === selectedIdx;
              const hasOverride = overrideNames.has(pt.name);
              return (
                <button
                  key={pt.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 border ${
                    isActive
                      ? "bg-card border-border text-foreground shadow-sm"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: pt.color || "#6366f1" }}
                  />
                  <span className="truncate max-w-[100px]">{pt.name}</span>
                  {hasOverride && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-1 py-0.5 rounded-full shrink-0">
                      上書き
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Selected content - always visible */}
          {selected && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: selected.color || "#6366f1" }}
                />
                <span className="font-semibold text-sm">{selected.name}</span>
                {overrideNames.has(selected.name) && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">
                    上書きあり
                  </span>
                )}
              </div>
              <PositionTypeOverrideSection eventId={eventId} positionType={selected} />
            </div>
          )}
        </>
      ) : (
        /* Accordion for ≥6 types */
        <div className="space-y-2">
          {positionTypes.map((pt) => {
            const isOpen = openAccordionIds[pt.id] ?? false;
            const hasOverride = overrideNames.has(pt.name);
            return (
              <div key={pt.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleAccordion(pt.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: pt.color || "#6366f1" }}
                  />
                  <span className="font-semibold text-sm flex-1 text-left truncate">{pt.name}</span>
                  {hasOverride && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0">
                      上書きあり
                    </span>
                  )}
                  <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }} className="inline-flex shrink-0">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 border-t border-border pt-3">
                        <PositionTypeOverrideSection eventId={eventId} positionType={pt} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}