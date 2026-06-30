import { Headphones, Star } from "lucide-react";

const ROLE_ICONS = {
  "インカム": Headphones,
  "セクションチーフ": Star,
};

const ROLE_ICON_COLORS = {
  "インカム": "text-orange-500",
  "セクションチーフ": "text-purple-500",
};

export default function RoleIcon({ role, className = "" }) {
  const Icon = ROLE_ICONS[role];
  if (!Icon) return null;
  const colorClass = ROLE_ICON_COLORS[role] || "text-primary";
  return <Icon className={`w-3 h-3 shrink-0 ${colorClass} ${className}`} title={role} />;
}