import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShieldCheck, History, Lock, QrCode, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UserRoleManager from "@/components/UserRoleManager";
import PortalRestrictionManager from "@/components/PortalRestrictionManager";
import ActivityLogViewer from "@/components/ActivityLogViewer";
import AccessRestrictionManager from "@/components/AccessRestrictionManager";
import StaffQrExport from "@/components/StaffQrExport";
import EventScopeSelector from "@/components/admin/EventScopeSelector";
import { useUserRole } from "@/hooks/useUserRole";

const SECTIONS = [
  { id: "users", label: "ユーザー管理", icon: Users },
  { id: "portal_restriction", label: "ポータル制限", icon: ShieldCheck },
  { id: "operation_logs", label: "操作ログ", icon: History },
  { id: "access_restriction", label: "アクセス制限", icon: Lock },
  { id: "staff_qr", label: "スタッフQR", icon: QrCode },
];

const EVENT_SCOPED = new Set(["operation_logs", "access_restriction", "staff_qr"]);

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [section, setSection] = useState("users");
  const [selectedEventId, setSelectedEventId] = useState("");

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

  const renderSection = () => {
    if (EVENT_SCOPED.has(section)) {
      if (!selectedEventId) {
        return (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 opacity-30" />
            <p className="text-sm">対象イベントを選択してください</p>
          </div>
        );
      }
      if (section === "operation_logs") return <ActivityLogViewer eventId={selectedEventId} />;
      if (section === "access_restriction") return <AccessRestrictionManager eventId={selectedEventId} />;
      return <StaffQrExport eventId={selectedEventId} />;
    }
    switch (section) {
      case "users": return <UserRoleManager />;
      case "portal_restriction": return <PortalRestrictionManager />;
      default: return null;
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-1.5 py-2">
        {/* Section bar */}
        <div className="sticky top-[56px] z-40 mb-3 border-b border-border/70 bg-muted/40">
          <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-4 sm:overflow-x-auto sm:scrollbar-hide">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex min-h-9 min-w-0 select-none items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-1 text-xs font-semibold transition-colors sm:min-h-0 sm:justify-start sm:px-0 sm:py-2 ${
                  section === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                aria-current={section === id ? "page" : undefined}
              >
                <Icon className="hidden h-3.5 w-3.5 sm:block" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {EVENT_SCOPED.has(section) && (
          <EventScopeSelector value={selectedEventId} onChange={setSelectedEventId} />
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${section}-${selectedEventId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
    </div>
  );
}