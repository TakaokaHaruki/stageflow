import ActivityLogViewer from "@/components/ActivityLogViewer";
import UserRoleManager from "@/components/UserRoleManager";
import SectionHeader from "@/components/SectionHeader";
import { History, Users } from "lucide-react";

export default function AdminSettings({ eventId, section = "users" }) {
  return (
    <div>
      <SectionHeader
        icon={section === "users" ? Users : History}
        title={section === "users" ? "ユーザー管理" : "操作ログ"}
      />
      {section === "users" && <UserRoleManager />}
      {section === "logs" && <ActivityLogViewer eventId={eventId} />}
    </div>
  );
}
