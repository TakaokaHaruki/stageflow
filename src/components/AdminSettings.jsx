import ActivityLogViewer from "@/components/ActivityLogViewer";
import ViewLogViewer from "@/components/ViewLogViewer";
import UserRoleManager from "@/components/UserRoleManager";
import PortalRestrictionManager from "@/components/PortalRestrictionManager";
import { History, Users, Eye, ShieldOff } from "lucide-react";

export default function AdminSettings({ eventId, section = "users" }) {
  return (
    <div>
      {section === "users" && <UserRoleManager />}
      {section === "operation_logs" && <ActivityLogViewer eventId={eventId} />}
      {section === "view_logs" && <ViewLogViewer eventId={eventId} />}
      {section === "portal_restriction" && <PortalRestrictionManager />}
    </div>
  );
}