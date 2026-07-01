import ActivityLogViewer from "@/components/ActivityLogViewer";
import ViewLogViewer from "@/components/ViewLogViewer";
import UserRoleManager from "@/components/UserRoleManager";
import PortalRestrictionManager from "@/components/PortalRestrictionManager";
import GlobalBannerManager from "@/components/GlobalBannerManager";
import TabControlManager from "@/components/TabControlManager";
import StaffQrExport from "@/components/StaffQrExport";

export default function AdminSettings({ eventId, section = "users" }) {
  return (
    <div>
      {section === "users" && <UserRoleManager />}
      {section === "operation_logs" && <ActivityLogViewer eventId={eventId} />}
      {section === "view_logs" && <ViewLogViewer eventId={eventId} />}
      {section === "portal_restriction" && <PortalRestrictionManager />}
      {section === "global_banner" && <GlobalBannerManager />}
      {section === "tab_control" && <TabControlManager />}
      {section === "staff_qr" && <StaffQrExport eventId={eventId} />}
    </div>
  );
}