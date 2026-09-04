import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, ChevronRight, Trash2, Pencil, Lock, Copy } from "lucide-react";
import { formatJaDate } from "@/lib/dateFormat";
import EventPublishToggle from "@/components/EventPublishToggle";
import CloneEventModal from "@/components/CloneEventModal";

export default function EventListItem({ event, isToday, isAdmin, canEdit, isGuest, onEdit, onDelete }) {
  const [showClone, setShowClone] = useState(false);
  const restricted = Boolean(event.admin_only) && !isAdmin;

  const content = (
    <div className="flex items-center justify-between gap-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <h2 className="text-sm font-semibold text-foreground truncate">{event.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {event.date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {formatJaDate(event.date)}
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5" />
              {event.venue}
            </span>
          )}
          <EventPublishToggle event={event} canEdit={canEdit} />
        </div>
      </div>
      {!restricted && (
        <div className="flex shrink-0 items-center justify-end gap-0.5">
          {!isGuest && (
            <>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowClone(true); }}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-sky-600 hover:bg-sky-500/10 transition-colors select-none sm:h-8 sm:w-8"
                aria-label={`${event.name} をコピーして新規作成`}
                title="コピーして新規作成">
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => onEdit(e, event)}
                disabled={!canEdit}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:pointer-events-none select-none sm:h-8 sm:w-8"
                aria-label={`${event.name} を編集`}>
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => onDelete(e, event.id, event.name)}
                disabled={!canEdit}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:pointer-events-none select-none sm:h-8 sm:w-8"
                aria-label={`${event.name} を削除`}>
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      )}
    </div>
  );

  if (restricted) {
    return (
      <div className="relative">
        <div className={`group block bg-card border rounded-lg px-2.5 py-1.5 opacity-40 ${isToday ? "border-primary" : "border-border"}`}>
          {content}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow border border-border">
            <Lock className="h-3.5 w-3.5" />
            閲覧する権限がありません
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link
        to={`/events/${event.id}`}
        className={`group block bg-card border rounded-lg px-2.5 py-1.5 hover:shadow-sm transition-all duration-200 ${
          isToday ? "border-primary hover:border-primary/60" : "border-border hover:border-primary/40"
        }`}>
        {content}
      </Link>
      {showClone && (
        <CloneEventModal sourceEvent={event} onClose={() => setShowClone(false)} />
      )}
    </>
  );
}