import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useUserRole } from "@/hooks/useUserRole";
import { Users, ShieldCheck, Bell, LayoutTemplate, HelpCircle, Settings, ClipboardList, Tag, LogOut, User as UserIcon, HardDriveDownload } from "lucide-react";
import BackButton from "@/components/BackButton";
import CrewlyLogo from "@/components/CrewlyLogo";
import ThemeToggle from "@/components/ThemeToggle";
import UserNameEditor, { getUserDisplayName } from "@/components/UserNameEditor";
import UserRoleManager from "@/components/UserRoleManager";
import PortalRestrictionManager from "@/components/PortalRestrictionManager";
import GlobalBannerManager from "@/components/GlobalBannerManager";
import LoginHelpManager from "@/components/LoginHelpManager";
import BackupManager from "@/components/BackupManager";
import PositionTypeManagement from "@/components/PositionTypeManagement";
import PositionPresetManager from "@/components/PositionPresetManager";
import VenueManager from "@/components/VenueManager";
import TagManagement from "@/components/TagManagement";
import { motion, AnimatePresence } from "framer-motion";

const ADMIN_SECTIONS = [
  { id: "users", label: "ユーザー管理", icon: Users },
  { id: "portal_restriction", label: "ポータル制限", icon: ShieldCheck },
  { id: "global_banner", label: "グローバル通知", icon: Bell },
  { id: "login_help", label: "ログイン案内", icon: HelpCircle },
  { id: "backup", label: "バックアップ", icon: HardDriveDownload },
];
const SETTINGS_SECTIONS = [
  { id: "positions", label: "ポジション設定", icon: Settings },
  { id: "presets", label: "ポジションプリセット", icon: ClipboardList },
  { id: "venues", label: "会場管理", icon: LayoutTemplate },
  { id: "tag_management", label: "タグ・役割管理", icon: Tag },
];

export default function ManagementSettings() {
  const navigate = useNavigate();
  const { isAdmin, canEdit } = useUserRole();
  const [group, setGroup] = useState(isAdmin ? "admin" : "settings");
  const [section, setSection] = useState(isAdmin ? "users" : "positions");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser).catch(() => {}); }, []);

  if (!canEdit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <h1 className="text-base font-bold">閲覧する権限がありません</h1>
          <button className="mt-4 text-sm text-primary underline" onClick={() => navigate("/events")}>イベント一覧へ戻る</button>
        </div>
      </div>
    );
  }

  const sections = group === "admin" ? ADMIN_SECTIONS : SETTINGS_SECTIONS;
  const validSection = sections.some((s) => s.id === section) ? section : sections[0].id;

  const selectGroup = (g) => {
    setGroup(g);
    setSection(g === "admin" ? ADMIN_SECTIONS[0].id : SETTINGS_SECTIONS[0].id);
  };

  const renderSection = () => {
    if (group === "admin") {
      switch (validSection) {
        case "users": return <UserRoleManager />;
        case "portal_restriction": return <PortalRestrictionManager />;
        case "global_banner": return <GlobalBannerManager />;
        case "login_help": return <LoginHelpManager />;
        case "backup": return <BackupManager />;
        default: return null;
      }
    }
    switch (validSection) {
      case "positions": return <PositionTypeManagement mode="global" section="positions" />;
      case "presets": return <PositionPresetManager mode="global" />;
      case "venues": return <VenueManager />;
      case "tag_management": return <TagManagement />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="bg-card/80 dark:bg-card/70 backdrop-blur-md border-b border-border sticky top-0 z-50 safe-area-top">
        <div className="max-w-[1400px] mx-auto px-2 pb-1.5 pt-1 flex items-center gap-1.5">
          <BackButton to="/events" label="イベント一覧へ戻る" />
          <CrewlyLogo className="mr-1" administrator={isAdmin} />
          <h1 className="shrink-0 text-base font-bold tracking-tight">管理設定</h1>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {currentUser && (
              <div className="flex h-9 max-w-36 shrink-0 items-center gap-0.5 rounded-md bg-muted px-0.5 sm:h-7 sm:gap-1 sm:px-1">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 sm:h-5 sm:w-5">
                  <UserIcon className="w-3 h-3 text-primary" />
                </div>
                <span className="hidden max-w-20 truncate text-[11px] font-medium sm:block">{getUserDisplayName(currentUser)}</span>
                <UserNameEditor user={currentUser} onSaved={setCurrentUser} />
                <button onClick={() => base44.auth.logout()} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive sm:h-5 sm:w-5" title="ログアウト" aria-label="ログアウト">
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-1.5 py-2 pb-16 sm:pb-8">
        {/* Group tabs */}
        {isAdmin && (
          <div className="flex gap-2 mb-2">
            {["admin", "settings"].map((g) => (
              <button
                key={g}
                onClick={() => selectGroup(g)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${group === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                {g === "admin" ? "管理者設定" : "管理設定"}
              </button>
            ))}
          </div>
        )}

        {/* Section bar */}
        <div className="border-b border-border/70 bg-muted/40 mb-3 sticky top-[56px] z-40">
          <div className="grid grid-cols-3 gap-1 sm:flex sm:gap-4 sm:overflow-x-auto sm:scrollbar-hide">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`flex min-h-9 min-w-0 select-none items-center justify-center gap-1 whitespace-normal border-b-2 px-1 py-1 text-center text-[10px] font-semibold leading-tight transition-colors sm:min-h-0 sm:shrink-0 sm:justify-start sm:gap-1.5 sm:whitespace-nowrap sm:px-0 sm:py-2 sm:text-left sm:text-xs ${validSection === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                aria-current={validSection === id ? "page" : undefined}
              >
                <Icon className="hidden h-3.5 w-3.5 sm:block" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${group}-${validSection}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}