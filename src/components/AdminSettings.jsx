import ActivityLogViewer from "@/components/ActivityLogViewer";
import UserRoleManager from "@/components/UserRoleManager";

export default function AdminSettings({
  eventId,
  event,
}) {
  return (
    <div>
      <h2 className="text-sm font-bold mb-2">管理者設定</h2>

      {/* User role management */}
      <div className="mb-2">
        <UserRoleManager />
      </div>

      {/* Operation log */}
      <ActivityLogViewer eventId={eventId} />
    </div>
  );
}