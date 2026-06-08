import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users } from "lucide-react";

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
  const [editingId, setEditingId] = useState(null);

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
    onError: (_, __, ctx) => queryClient.setQueryData(["users-all"], ctx?.prev),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users-all"] });
      setEditingId(null);
    },
  });

  if (isLoading) return (
    <div className="flex justify-center py-4">
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Users className="w-3.5 h-3.5 text-primary" />
        <h3 className="text-xs font-bold">ユーザー管理</h3>
      </div>
      <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
        {users.map((u) => (
          <div key={u.id} className="bg-card px-2.5 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{u.full_name || u.email}</p>
              {u.full_name && <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>}
            </div>
            {editingId === u.id ? (
              <select
                autoFocus
                defaultValue={u.role || "user"}
                onBlur={() => setEditingId(null)}
                onChange={(e) => updateRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                className="text-xs border border-input rounded px-1.5 py-0.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setEditingId(u.id)}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_STYLE[u.role] || ROLE_STYLE.user}`}
              >
                {ROLE_OPTIONS.find((r) => r.value === u.role)?.label || "ユーザー"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}