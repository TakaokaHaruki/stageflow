import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import useSignedUrls from "@/hooks/useSignedUrls";
import { getRecordCategory } from "@/lib/eventRecordCategories";
import { formatJaDate } from "@/lib/dateFormat";

export default function EventRecordCard({ record, showEvent = false, onEdit, onDelete }) {
  const urls = useSignedUrls(record.photo_uris || []);
  const category = getRecordCategory(record.category);
  const Icon = category.icon;
  const photos = (record.photo_uris || []).map((uri) => urls[uri]).filter(Boolean);
  const dateLabel = [formatJaDate(record.event_date), record.author_name].filter(Boolean).join("・");

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${category.badgeClass}`}>
          <Icon className="h-3 w-3" />
          {category.name}
        </span>
        {dateLabel && <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{dateLabel}</span>}
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {record.created_date ? format(new Date(record.created_date), "M/d HH:mm", { locale: ja }) : ""}
        </span>
      </div>

      {showEvent && record.event_id && (
        <Link
          to={`/events/${record.event_id}?tab=records`}
          className="inline-flex max-w-full items-center gap-1 truncate text-[11px] font-semibold text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{record.event_name || "イベントを開く"}</span>
        </Link>
      )}

      {record.memo && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{record.memo}</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
          {photos.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img src={url} alt="記録写真" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
            </a>
          ))}
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="flex justify-end gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(record)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              title="編集"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(record)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}