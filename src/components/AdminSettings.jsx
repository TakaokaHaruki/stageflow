import ActivityLogViewer from "@/components/ActivityLogViewer";
import UserRoleManager from "@/components/UserRoleManager";

export default function AdminSettings({ eventId, section = "users" }) {
  return (
    <div>
      {section === "users" && <UserRoleManager />}
      {section === "logs" && <ActivityLogViewer eventId={eventId} />}
    </div>
  );
}
