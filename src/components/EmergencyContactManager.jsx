import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Phone, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import SectionHeader from "@/components/SectionHeader";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function EmergencyContactManager({ eventId }) {
  const queryClient = useQueryClient();
  const { canEdit } = useUserRole();
  const [newRole, setNewRole] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["emergencyContacts", eventId],
    queryFn: () => base44.entities.EmergencyContact.filter({ event_id: eventId }),
    select: (data) => [...data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmergencyContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencyContacts", eventId] });
      toast.success("緊急連絡先を追加しました");
      setNewRole(""); setNewName(""); setNewPhone("");
    },
    onError: () => toast.error("追加に失敗しました"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmergencyContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencyContacts", eventId] });
      toast.success("更新しました");
      setEditingId(null);
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmergencyContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emergencyContacts", eventId] });
      toast.success("削除しました");
      setPendingDelete(null);
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, direction }) => {
      const sorted = [...contacts];
      const idx = sorted.findIndex((c) => c.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx];
      const b = sorted[swapIdx];
      await base44.entities.EmergencyContact.bulkUpdate([
        { id: a.id, order: (b.order ?? swapIdx) },
        { id: b.id, order: (a.order ?? idx) },
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["emergencyContacts", eventId] }),
    onError: () => toast.error("並び替えに失敗しました"),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newRole.trim() || !newName.trim() || !newPhone.trim()) return;
    createMutation.mutate({
      event_id: eventId,
      role_title: newRole.trim(),
      name: newName.trim(),
      phone: newPhone.trim(),
      order: contacts.length,
    });
  };

  const handleSaveEdit = (id) => {
    if (!editRole.trim() || !editName.trim() || !editPhone.trim()) return;
    updateMutation.mutate({
      id,
      data: { role_title: editRole.trim(), name: editName.trim(), phone: editPhone.trim() },
    });
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditRole(c.role_title);
    setEditName(c.name);
    setEditPhone(c.phone);
  };

  if (!canEdit) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        緊急連絡先の管理権限がありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Phone}
        title="緊急連絡先"
        subtitle="当日の緊急連絡先を登録します。スタッフポータルに表示されます。"
      />

      {/* Add form */}
      <form onSubmit={handleCreate} className="bg-card border border-border rounded-lg p-4 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="役職名（例: 統括チーフ）"
            className="h-9"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="担当者名"
            className="h-9"
          />
          <Input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="電話番号"
            type="tel"
            className="h-9"
          />
        </div>
        <Button type="submit" size="sm" className="gap-1 w-full sm:w-auto" disabled={createMutation.isPending}>
          <Plus className="w-3.5 h-3.5" />追加
        </Button>
      </form>

      {/* List */}
      <div className="space-y-2">
        {contacts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">緊急連絡先が登録されていません</p>
        )}
        {contacts.map((c, idx) => (
          <div
            key={c.id}
            className="bg-card border border-border rounded-lg p-4 flex items-center gap-2"
          >
            {editingId === c.id ? (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input value={editRole} onChange={(e) => setEditRole(e.target.value)} className="h-8" />
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel" className="h-8" />
                <div className="flex gap-1 sm:col-span-3">
                  <Button size="sm" onClick={() => handleSaveEdit(c.id)} disabled={updateMutation.isPending}>保存</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>キャンセル</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => reorderMutation.mutate({ id: c.id, direction: "up" })}
                    disabled={idx === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => reorderMutation.mutate({ id: c.id, direction: "down" })}
                    disabled={idx === contacts.length - 1}
                    className="!text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary">{c.role_title}</p>
                  <p className="text-sm font-medium">{c.name}</p>
                  <a href={`tel:${c.phone}`} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5">
                    <Phone className="w-3 h-3" />{c.phone}
                  </a>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(c)}>編集</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => setPendingDelete(c)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          message={`「${pendingDelete.role_title} - ${pendingDelete.name}」を削除しますか？`}
          confirmLabel="削除"
          confirmVariant="destructive"
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}