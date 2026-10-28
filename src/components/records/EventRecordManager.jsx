import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Camera, Layers } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/SectionHeader";
import SectionTabBar from "@/components/SectionTabBar";
import ConfirmDialog from "@/components/ConfirmDialog";
import EventRecordForm from "@/components/records/EventRecordForm";
import EventRecordCard from "@/components/records/EventRecordCard";
import { RECORD_CATEGORIES } from "@/lib/eventRecordCategories";
import { LIVE_SYNC_INTERVAL } from "@/lib/liveSync";
import { useUserRole } from "@/hooks/useUserRole";
import { getUserDisplayName } from "@/lib/userDisplay";

export default function EventRecordManager({ eventId, eventName = "", eventDate = "" }) {
  const { isAdmin } = useUserRole();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [filter, setFilter] = useState("すべて");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["eventRecords", eventId],
    queryFn: () => base44.entities.EventRecord.filter({ event_id: eventId }, "-created_date"),
    refetchInterval: LIVE_SYNC_INTERVAL,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["eventRecords", eventId] });
    queryClient.invalidateQueries({ queryKey: ["event-records"] });
  };

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.EventRecord.create({ ...data, author_name: user ? getUserDisplayName(user) : "" }),
    onSuccess: () => {
      invalidate();
      toast.success("記録を投稿しました");
    },
    onError: () => toast.error("投稿に失敗しました"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EventRecord.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("記録を更新しました");
      setEditing(null);
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EventRecord.delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("記録を削除しました");
    },
    onError: () => toast.error("削除に失敗しました"),
  });

  const canModify = (record) => isAdmin || (!!user?.id && record.created_by_id === user.id);
  const visible = records.filter((r) => filter === "すべて" || (r.category || "その他") === filter);
  const filterItems = [
    { id: "すべて", label: "すべて", icon: Layers },
    ...RECORD_CATEGORIES.map(({ name, icon }) => ({ id: name, label: name, icon })),
  ];

  return (
    <div className="space-y-3">
      <SectionHeader icon={Camera} title="イベント記録" description={`${records.length}件`} />

      {editing ? (
        <EventRecordForm
          eventId={eventId}
          eventName={eventName}
          eventDate={eventDate}
          record={editing}
          onCancel={() => setEditing(null)}
          onSaved={(data) => updateMutation.mutateAsync({ id: editing.id, data })}
        />
      ) : (
        <EventRecordForm
          eventId={eventId}
          eventName={eventName}
          eventDate={eventDate}
          onSaved={(data) => createMutation.mutateAsync(data)}
        />
      )}

      <SectionTabBar
        items={filterItems}
        activeId={filter}
        onSelect={setFilter}
        className="rounded-lg"
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="py-14 text-center text-muted-foreground">
          <Camera className="mx-auto mb-2 h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">まだ記録がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((record) => (
            <EventRecordCard
              key={record.id}
              record={record}
              onEdit={canModify(record) ? setEditing : undefined}
              onDelete={canModify(record) ? setConfirmDelete : undefined}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="この記録を削除しますか？"
          confirmLabel="削除"
          onConfirm={() => {
            deleteMutation.mutate(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}