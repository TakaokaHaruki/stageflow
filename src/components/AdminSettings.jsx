import ActivityLogViewer from "@/components/ActivityLogViewer";
import AccessRestrictionManager from "@/components/AccessRestrictionManager";
import StaffQrExport from "@/components/StaffQrExport";

export default function AdminSettings({ eventId, section = "operation_logs" }) {
  return (
    <div>
      {section === "operation_logs" && <ActivityLogViewer eventId={eventId} />}
      {section === "access_restriction" && <AccessRestrictionManager eventId={eventId} />}
      {section === "staff_qr" && <StaffQrExport eventId={eventId} />}
    </div>
  );
}