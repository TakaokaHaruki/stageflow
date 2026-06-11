import ActivityLogViewer from "@/components/ActivityLogViewer";
import ViewLogViewer from "@/components/ViewLogViewer";
import UserRoleManager from "@/components/UserRoleManager";
import SectionHeader from "@/components/SectionHeader";
import { History, Users, Eye } from "lucide-react";

export default function AdminSettings({ eventId, section = "users" }) {
  const icon = section === "users" ? Users : section === "operation_logs" ? History : Eye;
  const title = section === "users" ? "ユーザー管理" : section === "operation_logs" ? "操作ログ" : "閲覧ログ";

  return (
    <div>
      <SectionHeader icon={icon} title={title} />
      {section === "users" && <UserRoleManager />}
      {section === "operation_logs" && <ActivityLogViewer eventId={eventId} />}
      {section === "view_logs" && <ViewLogViewer eventId={eventId} />}
    </div>
  );
}