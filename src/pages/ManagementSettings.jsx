import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ShieldCheck, Bell, LayoutTemplate, HelpCircle, Settings, ClipboardList, Tag, HardDriveDownload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlobalBannerManager from "@/components/GlobalBannerManager";
import LoginHelpManager from "@/components/LoginHelpManager";
import BackupManager from "@/components/BackupManager";
import PositionTypeManagement from "@/components/PositionTypeManagement";
import PositionPresetManager from "@/components/PositionPresetManager";
import VenueManager from "@/components/VenueManager";
import TagManagement from "@/components/TagManagement";
import { useUserRole } from "@/hooks/useUserRole";

const SECTIONS = [
  { id: "positions", label: "ポジション共通定義", icon: Settings },
  { id: "presets", label: "プリセット共通定義", icon: ClipboardList },
  { id: "venues", label: "会場管理", icon: LayoutTemplate },
  { id: "tag_management", label: "タグ・役割管理", icon: Tag },
  { id: "global_banner", label: "グローバル通知", icon: Bell },
  { id: "login_help", label: "ログイン案内", icon: HelpCircle },
  { id: "backup", label: "バックアップ", icon: HardDriveDownload },
];

export default function ManagementSettings() {
  const navigate = useNavigate();
  const { canEdit } = useUserRole();
  const [section, setSection] = useState("positions");

  if (!canEdit) {
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
    switch (section) {
      case "positions": return <PositionTypeManagement mode="global" section="positions" />;
      case "presets": return <PositionPresetManager mode="global" />;
      case "venues": return <VenueManager />;
      case "tag_management": return <TagManagement />;
      case "global_banner": return <GlobalBannerManager />;
      case "login_help": return <LoginHelpManager />;
      case "backup": return <BackupManager />;
      default: return null;
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-1.5 py-2">
        {/* Section bar */}
        <div className="sticky top-[56px] z-40 mb-3 border-b border-border/70 bg-muted/40">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex min-h-11 shrink-0 select-none items-center justify-start gap-1.5 whitespace-nowrap border-b-2 px-1 py-2 text-left text-xs font-semibold transition-colors ${
                  section === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                aria-current={section === id ? "page" : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
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
  );
}