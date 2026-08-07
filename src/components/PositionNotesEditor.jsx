import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SectionHeader from "@/components/SectionHeader";
import PositionTypeOverrideSection from "@/components/PositionTypeOverrideSection";
import PositionTypeDescriptionEditor from "@/components/PositionTypeDescriptionEditor";
import { useUserRole } from "@/hooks/useUserRole";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import EventLockBanner from "@/components/EventLockBanner";

const SUBTITLE = "イベント固有の説明文・資料の記載を未入力の場合は全イベント共通の情報が使用されます";

function TwoColumnContent({ eventId, positionType, isAdmin }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* 共通（全イベント） */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">共通</span>
          <span className="text-[10px] text-muted-foreground">全イベント</span>
        </div>
        <PositionTypeDescriptionEditor positionType={positionType} isAdmin={isAdmin} alwaysOpen />
      </div>

      {/* 共通（このイベント） */}
      <div className="space-y-2 md:border-l md:border-border md:pl-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
            共通
          </span>
          <span className="text-[10px] text-muted-foreground">このイベント</span>
        </div>
        <PositionTypeOverrideSection eventId={eventId} positionType={positionType} />
      </div>
    </div>
  );
}

export default function PositionNotesEditor({ eventId, isLocked = false }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [openAccordionIds, setOpenAccordionIds] = useState({});
  const { canEdit } = useUserRole();
  const isAdmin = canEdit && !isLocked;

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
          subtitle={SUBTITLE}
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
          subtitle={SUBTITLE}
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
        subtitle={SUBTITLE}
      />

      {isLocked && <EventLockBanner />}

      {useTabs ? (
        /* Tab navigation for ≤5 types */
        <>
          <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            {positionTypes.map((pt, idx) => {
              const isActive = idx === selectedIdx;
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
              </div>
              <TwoColumnContent
                eventId={eventId}
                positionType={selected}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </>
      ) : (
        /* Accordion for ≥6 types */
        <div className="space-y-2">
          {positionTypes.map((pt) => {
            const isOpen = openAccordionIds[pt.id] ?? false;
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
                        <TwoColumnContent
                          eventId={eventId}
                          positionType={pt}
                          isAdmin={isAdmin}
                        />
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