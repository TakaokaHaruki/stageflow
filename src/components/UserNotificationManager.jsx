import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2, Bell, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/SectionHeader";
import { getUserDisplayName } from "@/lib/userDisplay";

const ROLE_OPTIONS = [
  { value: "admin", label: "管理者" },
  { value: "chief", label: "チーフ" },
  { value: "acast_staff", label: "A-CAST社員" },
  { value: "user", label: "ユーザー" },
];

const nowJst = () => {
  const jst = new Date(Date.now() + 9 * 60 * 60000);
  return jst.toISOString().slice(0, 16).replace("T", " ");
};

export default function UserNotificationManager() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const { data: notifications = [] } = useQuery({
    queryKey: ["userNotifications", "all"],
    queryFn: () => base44.entities.UserNotification.list("-created_date", 100),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      base44.entities.UserNotification.create({
        title: title.trim(),
        message: message.trim(),
        target_roles: roles,
        target_user_ids: selectedUsers,
        is_active: true,
        created_at_jst: nowJst(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userNotifications"] });
      setTitle("");
      setMessage("");
      setRoles([]);
      setSelectedUsers([]);
      toast.success("通知を送信しました");
    },
    onError: () => toast.error("送信に失敗しました"),
  });

  const toggleMutation = useMutation({
    mutationFn: (n) =>
      base44.entities.UserNotification.update(n.id, { is_active: !n.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserNotification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["userNotifications"] }),
  });

  const toggleRole = (r) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  const toggleUser = (id) =>
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Bell}
        title="ユーザー通知"
        subtitle="ログインユーザー（ユーザー・チーフ等）に個別の通知バナーを表示します"
      />

      <div className="bg-card border border-border rounded-2xl shadow-md p-4 space-y-3">
        <Input
          placeholder="件名（任意）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-sm"
        />
        <Textarea
          placeholder="通知メッセージを入力..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            対象ロール（未選択＝個別指定または全員）
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleRole(r.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  roles.includes(r.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
            対象ユーザーを個別指定（任意）
          </p>
          <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 space-y-0.5 scrollbar-hide">
            {users.length === 0 && (
              <p className="text-xs text-muted-foreground">ユーザーがいません</p>
            )}
            {users.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u.id)}
                  onChange={() => toggleUser(u.id)}
                  className="accent-primary"
                />
                <span className="text-sm truncate">{getUserDisplayName(u)}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{u.role}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => createMutation.mutate()}
          disabled={!message.trim() || createMutation.isPending}
          className="gap-1.5"
        >
          <Send className="w-3 h-3" />送信
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">通知はまだありません</p>
        )}
        {notifications.map((n) => (
          <div key={n.id} className="bg-card border border-border rounded-xl shadow-sm p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {n.title && <p className="text-sm font-bold">{n.title}</p>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {n.message}
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {n.target_roles?.map((r) => (
                    <span
                      key={r}
                      className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded"
                    >
                      {ROLE_OPTIONS.find((o) => o.value === r)?.label || r}
                    </span>
                  ))}
                  {n.target_user_ids?.length > 0 && (
                    <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                      個別{n.target_user_ids.length}人
                    </span>
                  )}
                  {!n.target_roles?.length && !n.target_user_ids?.length && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      全員
                    </span>
                  )}
                  {!n.is_active && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      停止中
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{n.created_at_jst}</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => toggleMutation.mutate(n)}
                  title={n.is_active ? "停止" : "有効化"}
                >
                  {n.is_active ? (
                    <Power className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <PowerOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-destructive"
                  onClick={() => deleteMutation.mutate(n.id)}
                  title="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}