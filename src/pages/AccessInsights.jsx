import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, BarChart3, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SectionTabBar from "@/components/SectionTabBar";
import AccessLogPanel from "@/components/access/AccessLogPanel";
import ViewLogPanel from "@/components/access/ViewLogPanel";
import { useUserRole } from "@/hooks/useUserRole";

const SECTIONS = [
  { id: "access", label: "アクセス履歴", icon: BarChart3 },
  { id: "views", label: "閲覧操作", icon: Eye },
];

export default function AccessInsights() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [section, setSection] = useState("access");

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <div>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h1 className="text-base font-bold">閲覧する権限がありません</h1>
          <button className="mt-4 text-sm text-primary underline" onClick={() => navigate("/home")}>ホームへ戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-1.5 pb-2">
      <SectionTabBar
        items={SECTIONS}
        activeId={section}
        onSelect={setSection}
        className="sticky top-[var(--app-header-height)] z-40 mb-3"
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {section === "access" ? <AccessLogPanel /> : <ViewLogPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}