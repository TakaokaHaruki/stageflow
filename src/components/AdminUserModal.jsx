import ModalShell, { ModalHeader } from "@/components/ModalShell";
import { ShieldCheck } from "lucide-react";
import UserRoleManager from "@/components/UserRoleManager";

export default function AdminUserModal({ onClose }) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg">
      <ModalHeader
        icon={<ShieldCheck className="w-5 h-5 text-primary" />}
        title="管理者設定"
        onClose={onClose}
      />
      <UserRoleManager />
    </ModalShell>
  );
}