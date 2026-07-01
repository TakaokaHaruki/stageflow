import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * イベント一覧カード用の公開トグル。
 * assignment_mode と staff_management_mode を同時に切り替え、
 * スタッフポータルへの公開/非公開を制御する。
 */
export default function EventPublishToggle({ event, canEdit }) {
  const queryClient = useQueryClient();
  const isPublic =
    event.assignment_mode === "public" || event.staff_management_mode === "public";

  const toggle = useMutation({
    mutationFn: async () => {
      const nextMode = isPublic ? "edit" : "public";
      return await base44.entities.Event.update(event.id, {
        assignment_mode: nextMode,
        staff_management_mode: nextMode,
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["events"] });
      const previous = queryClient.getQueryData(["events"]);
      const nextMode = isPublic ? "edit" : "public";
      const wasPublic = isPublic;
      queryClient.setQueryData(["events"], (old) =>
        (old || []).map((e) =>
          e.id === event.id
            ? { ...e, assignment_mode: nextMode, staff_management_mode: nextMode }
            : e
        )
      );
      return { previous, wasPublic };
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(["events"], context?.previous);
      toast.error("公開設定の変更に失敗しました");
    },
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(context.wasPublic ? "非公開にしました" : "公開しました");
    },
  });

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle.mutate();
  };

  if (!canEdit) {
    return isPublic ? (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-200 dark:border-green-800 dark:text-green-400">
        <Eye className="w-2.5 h-2.5" />
        公開中
      </span>
    ) : null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={toggle.isPending}
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-colors select-none disabled:opacity-50 ${
        isPublic
          ? "bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20 dark:border-green-800 dark:text-green-400"
          : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
      }`}
      title={isPublic ? "非公開にする" : "スタッフに公開する"}
    >
      {isPublic ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
      {isPublic ? "公開中" : "非公開"}
    </button>
  );
}