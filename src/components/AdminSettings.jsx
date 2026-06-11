import ActivityLogViewer from "@/components/ActivityLogViewer";
import ViewLogViewer from "@/components/ViewLogViewer";
import UserRoleManager from "@/components/UserRoleManager";
import VenueManager from "@/components/VenueManager";
import SectionHeader from "@/components/SectionHeader";
import { History, Users, Eye, MapPin } from "lucide-react";

const SECTION_META = {
  users: { icon: Users, title: "ユーザー管理" },
  operation_logs: { icon: History, title: "操作ログ" },
  view_logs: { icon: Eye, title: "閲覧ログ" },
  venues: { icon: MapPin, title: "会場管理" },
};

export default function AdminSettings({ eventId, section = "users" }) {
  const { icon, title } = SECTION_META[section] || SECTION_META.users;

  return (
    <div>
      <SectionHeader icon={icon} title={title} />
      {section === "users" && <UserRoleManager />}
      {section === "operation_logs" && <ActivityLogViewer eventId={eventId} />}
      {section === "view_logs" && <ViewLogViewer eventId={eventId} />}
      {section === "venues" && <VenueManager />}
    </div>
  );
}