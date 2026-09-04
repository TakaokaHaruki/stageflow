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
import SectionTabBar from "@/components/SectionTabBar";

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
        <SectionTabBar
          items={SECTIONS}
          activeId={section}
          onSelect={setSection}
          className="sticky top-[56px] z-40 mb-3"
        />

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