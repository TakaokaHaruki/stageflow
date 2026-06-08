import { MapPin, CheckSquare } from "lucide-react";
import ActivityLogViewer from "@/components/ActivityLogViewer";
import UserRoleManager from "@/components/UserRoleManager";

export default function AdminSettings({
  eventId,
  event,
  showMap,
  onToggleMap,
  showTasks,
  onToggleTasks,
}) {
  const featureToggles = [
    {
      icon: MapPin,
      label: "会場マップ機能",
      desc: "会場マップタブを表示します",
      value: showMap,
      onToggle: onToggleMap,
    },
    {
      icon: CheckSquare,
      label: "チェックリスト機能",
      desc: "チェックリストタブを表示します",
      value: showTasks,
      onToggle: onToggleTasks,
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-bold mb-2">管理者設定</h2>

      {/* Feature toggles */}
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border mb-2">
        {featureToggles.map(({ icon: Icon, label, desc, value, onToggle }) => (
          <div key={label} className="bg-card px-2.5 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => onToggle && onToggle(!value)}
              className={`relative w-10 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        ))}
      </div>

      {/* User role management */}
      <div className="mb-2">
        <UserRoleManager />
      </div>

      {/* Operation log */}
      <ActivityLogViewer eventId={eventId} />
    </div>
  );
}