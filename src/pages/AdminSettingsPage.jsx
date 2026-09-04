import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppNav from "@/components/AppNav";
import UserRoleManager from "@/components/UserRoleManager";
import PortalRestrictionManager from "@/components/PortalRestrictionManager";
import { useUserRole } from "@/hooks/useUserRole";

const SECTIONS = [
  { id: "users", label: "ユーザー管理", icon: Users },
  { id: "portal_restriction", label: "ポータル制限", icon: ShieldCheck },
];

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [section, setSection] = useState("users");

  if (!isAdmin) {
    return (
      <AppNav activeTab="admin-settings" title="管理者設定">
        <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
          <div>
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <h1 className="text-base font-bold">閲覧する権限がありません</h1>
            <button className="mt-4 text-sm text-primary underline" onClick={() => navigate("/home")}>ホームへ戻る</button>
          </div>
        </div>
      </AppNav>
    );
  }

  const renderSection = () => {
    switch (section) {
      case "users": return <UserRoleManager />;
      case "portal_restriction": return <PortalRestrictionManager />;
      default: return null;
    }
  };

  return (
    <AppNav activeTab="admin-settings" title="管理者設定">
      <div className="mx-auto max-w-[1400px] px-1.5 py-2">
        {/* Section bar */}
        <div className="sticky top-[56px] z-40 mb-3 border-b border-border/70 bg-muted/40">
          <div className="grid grid-cols-2 gap-1 sm:flex sm:gap-4 sm:overflow-x-auto sm:scrollbar-hide">
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

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppNav>
  );
}