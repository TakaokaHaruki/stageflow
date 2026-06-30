import { Headphones, Star, Shield, Theater } from "lucide-react";
import { useAllRoles } from "@/hooks/useAllRoles";

const ROLE_ICONS = {
  "インカム": Headphones,
  "セクションチーフ": Star,
  "バラシ": Theater,
};

export default function RoleIcon({ role, className = "" }) {
  const { getIconColor } = useAllRoles();
  const Icon = ROLE_ICONS[role] || Shield;
  const colorClass = getIconColor(role);
  return <Icon className={`w-3 h-3 shrink-0 ${colorClass} ${className}`} title={role} />;
}