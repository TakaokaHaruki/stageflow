import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

const ROLE_OPTIONS = [
  { value: "admin", label: "管理者" },
  { value: "chief", label: "チーフ" },
  { value: "user", label: "ユーザー" },
  { value: "unapproved", label: "未承認" },
];

const ROLE_STYLE = {
  admin: "bg-red-100 text-red-700",
  chief: "bg-blue-100 text-blue-700",
  user: "bg-green-100 text-green-700",
  unapproved: "bg-amber-100 text-amber-700",
};

export default function UserRoleManager() {
  const queryClient = useQueryClient();
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => base44.entities.User.update(userId, { role }),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ["users-all"] });
      const prev = queryClient.getQueryData(["users-all"]);
      queryClient.setQueryData(["users-all"], (old = []) =>
        old.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(["users-all"], ctx?.prev);
      toast.error("ロールの変更に失敗しました");
    },
    onSuccess: () => toast.success("ロールを変更しました"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users-all"] });
      setEditingRoleId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["users-all"] });
      const prev = queryClient.getQueryData(["users-all"]);
      queryClient.setQueryData(["users-all"], (old = []) => old.filter((u) => u.id !== userId));
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(["users-all"], ctx?.prev);
      toast.error("ユーザーの削除に失敗しました");
    },
    onSuccess: () => toast.success("ユーザーを削除しました"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["users-all"] }),
  });

  if (isLoading) return (
    <div className="flex justify-center py-4">
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const confirmDeleteUser = users.find((u) => u.id === confirmDeleteId);

  return (
    <div>
      <div className="mb-2 text-xs text-muted-foreground">{users.length}名</div>
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {users.map((u) => (
          <div key={u.id} className="bg-card px-2.5 py-2 flex items-center gap-2">
            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{u.full_name || u.email}</p>
              {u.full_name && <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>}
            </div>

            {/* Role */}
            {editingRoleId === u.id ? (
              <select
                autoFocus
                defaultValue={u.role || "user"}
                onBlur={() => setEditingRoleId(null)}
                onChange={(e) => updateRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                className="text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditingRoleId(u.id)}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_STYLE[u.role] || ROLE_STYLE.user}`}
              >
                {ROLE_OPTIONS.find((r) => r.value === u.role)?.label || "ユーザー"}
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => setConfirmDeleteId(u.id)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {confirmDeleteId && confirmDeleteUser && (
        <ConfirmDialog
          message={`「${confirmDeleteUser.full_name || confirmDeleteUser.email}」を削除しますか？\nこの操作は取り消せません。`}
          confirmLabel="削除"
          confirmVariant="destructive"
          onConfirm={() => { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}